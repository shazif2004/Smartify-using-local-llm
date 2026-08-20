from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class Student(BaseModel):
    name: str
    major: str


@router.get("/student")
def get_student():
    return {
        "name": "Abdul",
        "major": "Data Science",
        "project": "Smartify",
    }


@router.post("/student")
def create_student(student: Student):
    return {
        "message": "Student created successfully",
        "student": student,
    }