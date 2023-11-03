export type Command = {
  name: string
} & ({
  description: string
  type?: 1
} | {
  type: 2 | 3
})
