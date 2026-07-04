export interface Question {
  q: string
  a: string
}

export interface Category {
  id: string
  title: string
  icon: string
  questions: Question[]
}

export interface GuideData {
  title: string
  subtitle: string
  total_questions: number
  categories: Category[]
}
