import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Получаем вопрос из тела запроса
    const { question } = await req.json();

    // Временно, для проверки, просто выводим вопрос в консоль сервера
    // и возвращаем заранее заготовленный ответ.
    console.log('API Route received question:', question);

    // Сюда мы позже добавим всю магию с AI
    const dummyAnswer = `This is a placeholder answer to your question: "${question}"`;

    return NextResponse.json({ answer: dummyAnswer });

  } catch (error) {
    // Обработка возможных ошибок
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong on the server.' },
      { status: 500 }
    );
  }
}