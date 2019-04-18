const stack = require('callsite');
const chalk = require('chalk');

function raw(...args) {
  if (raw.silent) return
  const len = args.length
  for (var i=0; i<len; i++) {
    process.stdout.write(args.toString());
    if (i<len-1) process.stdout.write(raw.delimiter);
  }
  if (len) process.stdout.write(raw.linefeed);
}
raw.silent = false
raw.delimiter = ','
raw.linefeed = '\n'

function log(...args) {
  if (log.silent) return
  if (!log.style) chalk.level = 0
  //console.log(chalk.bgGreen('> fn'))
  if (log.tier || log.trace ) {
    const s = stack()
    let istr = ""
    if (log.tier) {
      let fname = s[1].getFunctionName();
      istr = chalk[module.exports[fname].color || "bgBlack"]('' + fname + '')
      if(log.time) istr += chalk.gray(' at '+new Date().toISOString())
      console.log(istr)
    } else if(log.time) {
      console.log(chalk.gray(new Date().toISOString()))
    }
    if (log.trace) {
      const len = (log.stack)?s.length:Math.min(s.length, 3)

      for (var i = 2; i<len; i++) {
        const site = s[i]
        let functionName = site.getFunctionName() || 'anonymous'
        if (i==2) functionName = chalk.cyanBright(functionName)
        else functionName = '  '+chalk.cyan(functionName)
        const file = site.getFileName()
        const line = site.getLineNumber()
        if (log.file && file && line) {
          console.log(
            functionName +
            chalk.gray(' in ' + file + ':' + line)
          );
        } else {
          console.log(functionName);
        }
      }
    }
  }
  if (args.length) {
    switch (log.outputFormat) {
      case "json":
        let json
        try {
          if (args.length == 1) {
            let arg = args[0]
            let argType = typeof arg
            if (arg instanceof Date) argType = "date"
            if (argType !== "object") arg = [arg]
            json = JSON.stringify(arg)
          } else {
            json = JSON.stringify(args)
          }
          console.log(json)
        } catch(error) {
          console.log(JSON.stringify({error}))
        }
        break;
      case "raw":
        for (var i =0; i<args.length; i++) {
          let str = ""
          let arg = args[i]
          let argType = typeof arg
          if (arg instanceof Date) argType = "date"
          if (argType === "object") {
            str = JSON.stringify(arg)
          } else {
            str = arg.toString()
          }
          console.log(str)
        }
        break;
      case "cli":
        if (args.length) console.log(...args)
        break;
    }
  }
  if (log.margin && (log.tier || log.trace || args.length)) console.log()
}
log.RAW = "raw"
log.JSON = "json"
log.CLI = "cli"
log.style = true
log.silent = false
log.tier = true
log.time = true
log.trace = true
log.stack = false
log.file = true
log.margin = true
log.outputFormat = log.CLI

function print(...args) {
  if (!print.silent) console.log(...args)
}
print.silent = false

function fn(...args) {
  if (fn.show) fn.method(...args)
}
fn.show = true
fn.color = 'bgBlue'
fn.method = log

function cmd(...args) {
  if (cmd.show) cmd.method(...args)
}
cmd.show = true
cmd.color = 'bgCyan'
cmd.method = log

function api(...args) {
  if (api.show) api.method(...args)
}
api.show = true
api.color = 'bgBlueBright'
api.method = log

function error(...args) {
  if (error.show) error.method(...args)
}
error.show = true
error.color = 'bgRed'
error.method = error

function warn(...args) {
  if (warn.show) warn.method(...args)
}
warn.show = true
warn.color = 'bgYellow'
warn.method = warn;

function status(...args) {
  if (status.show) status.method(...args)
}
status.show = true
status.color = 'bgGreen'
status.method = log

function output(...args) {
  if (output.show) output.method(...args)
}
output.show = true
output.color = 'bgBlack'
output.method = log


module.exports = {
  fn,
  cmd,
  api,
  error,
  warn,
  status,
  output,
  print,
  log,
  raw
}
