/** Runs async tasks one at a time, in call order. A failed task does not block the ones queued after it. */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task, task);
    tail = result.catch(() => {});
    return result;
  };
}
