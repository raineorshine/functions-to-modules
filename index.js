const fs = require('fs')
const path = require('path')
const assert = require('assert')
const espree = require('espree')
const mkdirp = require('mkdirp')

const inputModule = process.argv[2]
const outputDir = process.argv[3]
const moduleDir = process.argv[4]

if (!inputModule || !moduleDir || !outputDir) {
  console.log('Usage: functions-to-modules module outputDir moduleDir')
  process.exit(1)
}

const spliceString = (s, cutStart, cutEnd) =>
  s.slice(0, cutStart) + s.slice(cutEnd)

assert(spliceString('abcdef', 2, 4), 'abef')

const src = fs.readFileSync(inputModule, 'utf-8')
const ast = espree.parse(src, {
  ecmaVersion: 9,
  sourceType: 'module'
})

// import map
// { [importVariable]: statementSource }
const imports = ast.body
  .filter(statement => statement.type === 'ImportDeclaration')
  .reduce((accum, statement) => ({
    ...accum,
    ...statement.specifiers
      .reduce((acc2, specifier) => ({
        ...acc2,
        [specifier.local.name]: src.slice(statement.start, statement.end)
      }), {})
  }), {})

const exportedStatements = ast.body
  .filter(statement => statement.type === 'ExportNamedDeclaration')

const exported = exportedStatements
  .reduce((accum, statement, i) => ({
    ...accum,
    ...(statement.declaration.declarations || [])
      .reduce((acc2, dec) => {

  let index = statement.start - 1
  let lastNewLine = ''

  do {
    const nextIndex = src.slice(0, index).lastIndexOf('\n')
    if (nextIndex !== -1) {
      lastNewLine = src.slice(nextIndex, index)
      index -= lastNewLine.length
    }
    else {
      lastNewLine = src.slice(0, index)
      index = 0
    }
  }
  while(lastNewLine.trim() !== '')

  const comments = src.slice(index + 2, statement.start - 1)

  return {
  ...acc2,
  [dec.id.name]: {
    statement,
    comments//: !comments.trim().startsWith('export') ? comments : '// hi'
  }
}}, {})
  }), {})

let lastEnd = 0
const srcNew = Object.keys(exported).reduce((srcAccum, key, i) => {

  const srcNew = srcAccum
    + src.slice(
      lastEnd,
      exported[key].statement.start - exported[key].comments.length - 1
    )
    + `\nimport { ${key} } from './${moduleDir}/${key}.js'`
  lastEnd = exported[key].statement.end
  return srcNew
}, '')

+ '\n\nexport {\n' + Object.keys(exported).map(key => `  ${key},`).join('\n') + '\n}\n'

const newModules = Object.keys(exported).map(key => {
  const { statement: stm, comments }  = exported[key]
  const moduleSrc = src.slice(stm.start, stm.end)

  const moduleContainsWord = importKey =>
    (new RegExp(`\\b${importKey}\\b`)).test(moduleSrc) && importKey !== key

  const moduleImports = Object.keys(imports).filter(moduleContainsWord)
  const modules = Object.keys(exported).filter(moduleContainsWord)

  return {
    key,
    src:
      // modules
      (moduleImports.length > 0 ? moduleImports
        .map(key => imports[key])
        .join('\n') + `\n\n// ${moduleDir}\n` : '')
      // new modules
      + (modules.length > 0 ? modules
        .map(key => `import { ${key} } from './${key}.js'`)
        .join('\n') + '\n\n' : '')
      // comments
      + (comments ? comments + '\n' : '')
      // src
      + moduleSrc + '\n'
  }
})

// write new src
mkdirp.sync(outputDir)
fs.writeFileSync(`${outputDir}/${path.basename(inputModule)}`, srcNew)

// write new modules
mkdirp.sync(`${outputDir}/${moduleDir}`)
newModules.forEach(module => {
  fs.writeFileSync(`${outputDir}/${moduleDir}/${path.basename(module.key)}.js`, module.src)
})
