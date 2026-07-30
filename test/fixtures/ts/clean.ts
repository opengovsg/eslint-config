interface Person {
  name: string
  age: number
}

export const describe = ({ name, age }: Person): string => `${name} is ${age}`
