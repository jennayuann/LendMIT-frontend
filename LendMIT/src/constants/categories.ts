export const CATEGORIES = [
  'Academics',
  'Technology',
  'Home & Dorm',
  'Tools & Equipment',
  'Sports & Outdoors',
  'Arts & Music',
  'Games & Hobbies',
  'Clothing & Costumes',
  'Books & Media',
  'Miscellaneous',
] as const

export type Category = (typeof CATEGORIES)[number]
