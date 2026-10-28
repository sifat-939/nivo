export interface SingleFlightState<T> {
  promise: Promise<T> | null;
}

/** Run an operation once while it is pending, then allow it to run again. */
export function runSingleFlight<T>(
  state: SingleFlightState<T>,
  operation: () => Promise<T>
): Promise<T> {
  if (state.promise) {
    return state.promise;
  }

  const promise = operation();
  state.promise = promise;
  const clear = () => {
    if (state.promise === promise) {
      state.promise = null;
    }
  };
  void promise.then(clear, clear);
  return promise;
}
