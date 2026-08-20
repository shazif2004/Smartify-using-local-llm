from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.local_profile import get_local_user
from app.database import get_db

from app.models.document import Document
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion
from app.models.quiz_short_answer_question import QuizShortAnswerQuestion
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_answer import QuizAnswer
from app.models.user import User

from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizResponse,
    QuizQuestionResponse,
    QuizShortAnswerResponse,
)

from app.schemas.quiz_submission import (
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    QuestionResult,
)

from app.schemas.short_answer_submission import (
    ShortAnswerSubmissionRequest,
    ShortAnswerSubmissionResponse,
    ShortAnswerResult,
)

from app.services.ai_service import generate_quiz


router = APIRouter(
    prefix="/quizzes",
    tags=["Quizzes"],
)




# -------------------------------------------------------------------
# Generate quiz
# -------------------------------------------------------------------

@router.post(
    "/documents/{document_id}/generate",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_document_quiz(
    document_id: int,
    request: QuizGenerateRequest,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    document = database.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Generate MCQs + short-answer questions with AI.
    try:
        generated_quiz = generate_quiz(
            document_text=document.extracted_text,
            difficulty=request.difficulty,
            number_of_questions=request.number_of_questions,
        )

    except Exception as error:
        database.rollback()

        print(
            "QUIZ GENERATION ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI could not generate the quiz. Please try again.",
        ) from error

    try:
        # -----------------------------------------------------------
        # Create quiz
        # -----------------------------------------------------------

        quiz = Quiz(
            title=generated_quiz.title,
            document_id=document.id,
            owner_id=current_user.id,
        )

        database.add(quiz)

        # Generates quiz.id without committing yet.
        database.flush()

        # -----------------------------------------------------------
        # Save multiple-choice questions
        # -----------------------------------------------------------

        for question in generated_quiz.questions:
            database.add(
                QuizQuestion(
                    quiz_id=quiz.id,
                    question=question.question,
                    choice_a=question.choice_a,
                    choice_b=question.choice_b,
                    choice_c=question.choice_c,
                    choice_d=question.choice_d,
                    correct_answer=question.correct_answer,
                    explanation=question.explanation,
                )
            )

        # -----------------------------------------------------------
        # Save short-answer questions
        # -----------------------------------------------------------

        for question in generated_quiz.short_answer_questions:
            database.add(
                QuizShortAnswerQuestion(
                    quiz_id=quiz.id,
                    topic=question.topic,
                    question=question.question,
                    expected_answer=question.expected_answer,
                )
            )

        # Make sure IDs are generated before building response.
        database.flush()

        # -----------------------------------------------------------
        # Read saved questions back from database
        # -----------------------------------------------------------

        saved_mcq_questions = database.scalars(
            select(QuizQuestion)
            .where(
                QuizQuestion.quiz_id == quiz.id
            )
            .order_by(QuizQuestion.id)
        ).all()

        saved_short_answer_questions = database.scalars(
            select(QuizShortAnswerQuestion)
            .where(
                QuizShortAnswerQuestion.quiz_id == quiz.id
            )
            .order_by(QuizShortAnswerQuestion.id)
        ).all()

        database.commit()
        database.refresh(quiz)

    except Exception as error:
        database.rollback()

        print(
            "QUIZ SAVE ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The quiz could not be saved.",
        ) from error

    # IMPORTANT:
    # expected_answer is intentionally NOT returned here.
    # Students should only receive it after submitting their answer.

    return QuizResponse(
        id=quiz.id,
        title=quiz.title,
        document_id=document.id,
        questions=[
            QuizQuestionResponse(
                id=question.id,
                question=question.question,
                choice_a=question.choice_a,
                choice_b=question.choice_b,
                choice_c=question.choice_c,
                choice_d=question.choice_d,
            )
            for question in saved_mcq_questions
        ],
        short_answer_questions=[
            QuizShortAnswerResponse(
                id=question.id,
                topic=question.topic,
                question=question.question,
            )
            for question in saved_short_answer_questions
        ],
    )


# -------------------------------------------------------------------
# Submit multiple-choice answers
# -------------------------------------------------------------------

@router.post(
    "/{quiz_id}/submit",
    response_model=QuizSubmissionResponse,
)
def submit_quiz(
    quiz_id: int,
    request: QuizSubmissionRequest,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    quiz = database.scalar(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.owner_id == current_user.id,
        )
    )

    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    questions = database.scalars(
        select(QuizQuestion)
        .where(
            QuizQuestion.quiz_id == quiz.id
        )
        .order_by(QuizQuestion.id)
    ).all()

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quiz has no multiple-choice questions.",
        )

    question_lookup = {
        question.id: question
        for question in questions
    }

    score = 0
    results = []

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        score=0,
        total_questions=len(questions),
        percentage=0,
    )

    database.add(attempt)
    database.flush()

    for submitted in request.answers:
        question = question_lookup.get(
            submitted.question_id
        )

        if question is None:
            continue

        correct = (
            submitted.selected_answer
            == question.correct_answer
        )

        if correct:
            score += 1

        database.add(
            QuizAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                selected_answer=submitted.selected_answer,
                is_correct=correct,
            )
        )

        results.append(
            QuestionResult(
                question_id=question.id,
                selected_answer=submitted.selected_answer,
                correct_answer=question.correct_answer,
                is_correct=correct,
                explanation=question.explanation,
            )
        )

    attempt.score = score

    attempt.percentage = (
        score / len(questions)
    ) * 100

    database.commit()

    return QuizSubmissionResponse(
        score=attempt.score,
        total_questions=attempt.total_questions,
        percentage=attempt.percentage,
        results=results,
    )

@router.post(
    "/{quiz_id}/short-answers/submit",
    response_model=ShortAnswerSubmissionResponse,
)
def submit_short_answers(
    quiz_id: int,
    request: ShortAnswerSubmissionRequest,
    database: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    quiz = database.scalar(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.owner_id == current_user.id,
        )
    )

    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    questions = database.scalars(
        select(QuizShortAnswerQuestion)
        .where(
            QuizShortAnswerQuestion.quiz_id == quiz.id
        )
        .order_by(QuizShortAnswerQuestion.id)
    ).all()

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quiz has no short-answer questions.",
        )

    question_lookup = {
        question.id: question
        for question in questions
    }

    results = []

    for submitted in request.answers:
        question = question_lookup.get(
            submitted.question_id
        )

        if question is None:
            continue

        cleaned_answer = submitted.answer.strip()

        if not cleaned_answer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Short-answer responses cannot be empty.",
            )

        results.append(
            ShortAnswerResult(
                question_id=question.id,
                topic=question.topic,
                question=question.question,
                student_answer=cleaned_answer,
                expected_answer=question.expected_answer,
            )
        )

    if len(results) != len(questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please answer every short-answer question.",
        )

    return ShortAnswerSubmissionResponse(
        results=results,
    )
