import { useCallback, useMemo, useReducer } from "react";

type UndoState<T> = {
  past: T[];
  present: T;
  future: T[];
};

type Action<T> =
  | { type: "set"; next: T; limit: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; next: T };

function reducer<T>(state: UndoState<T>, action: Action<T>): UndoState<T> {
  switch (action.type) {
    case "set": {
      const { next, limit } = action;
      if (Object.is(next, state.present)) return state;

      const past = [...state.past, state.present];
      const trimmedPast = past.length > limit ? past.slice(past.length - limit) : past;
      return {
        past: trimmedPast,
        present: next,
        future: [],
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };
    }
    case "reset": {
      return {
        past: [],
        present: action.next,
        future: [],
      };
    }
    default:
      return state;
  }
}

export function useUndoRedo<T>(initial: T, limit = 20) {
  const [state, dispatch] = useReducer(reducer<T>, {
    past: [],
    present: initial,
    future: [],
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(state.present) : next;
      dispatch({ type: "set", next: resolved, limit });
    },
    [state.present, limit],
  );

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback((next: T) => dispatch({ type: "reset", next }), []);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return useMemo(
    () => ({
      state: state.present,
      set,
      undo,
      redo,
      reset,
      canUndo,
      canRedo,
      historySize: state.past.length,
    }),
    [state.present, state.past.length, canUndo, canRedo, set, undo, redo, reset],
  );
}
