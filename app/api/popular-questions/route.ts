import { NextResponse } from 'next/server'

const POPULAR_QUESTIONS = [
  'ミドストの基本は？',
  'ベイトフィネスを始めたい',
  '霞ヶ浦の攻め方は？',
  '冬のバス釣りで釣るには？',
  'ネコリグのセッティング方法',
  'ワカサギパターンとは？',
  '春のプリスポーン攻略',
  'ジグヘッドリグの使い方',
  'スピナーベイトの使いどころ',
  'フィネスワッキーの釣り方',
]

export async function GET() {
  return NextResponse.json(POPULAR_QUESTIONS)
}
