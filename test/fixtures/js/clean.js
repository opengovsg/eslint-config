import { EOL } from 'os'
import { resolve } from 'path'

export const describePath = (path) => `${resolve(path)}${EOL}`
