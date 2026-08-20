from app.services.chunking_service import create_concept_chunks


def test_create_concept_chunks() -> None:
    sample_text = """
Deep Learning and Supervised Neural Networks

Why Deep Learning Matters

Human learning is driven by experience. If you show a child enough
pictures of cats, the child learns the concept of a cat.

Traditional computer programs rely on hand-coded rules. Deep learning
allows computers to learn patterns directly from data.

How Neural Networks Learn: Supervised Learning

In supervised learning, we give the network an input x and a known
correct output y.

The neural network learns a function f(x) that maps the input to the
output.

House Price Prediction

The input can include house size, bedrooms, and location. The output is
the predicted house price.

Online Advertising

The input includes user and advertisement information. The output
predicts whether the user will click.
"""

    chunks = create_concept_chunks(
        page_text=sample_text,
        page_number=1,
    )

    assert len(chunks) == 4

    assert chunks[0].title == "Why Deep Learning Matters"
    assert chunks[1].title == "How Neural Networks Learn: Supervised Learning"
    assert chunks[2].title == "House Price Prediction"
    assert chunks[3].title == "Online Advertising"

    for chunk in chunks:
        assert chunk.page_number == 1
        assert chunk.content
        assert chunk.word_count > 0
        assert chunk.char_count > 0