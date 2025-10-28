const executeCommand = async (command: string): Promise<string> => {
  const { exec } = await import('node:child_process')

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${error.message}`)
      }
      if (stderr) {
        reject(`Stderr: ${stderr}`)
      }

      resolve(stdout)
    })
  })
}

export { executeCommand }
