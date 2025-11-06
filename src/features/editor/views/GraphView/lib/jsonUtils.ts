// Utility helpers for manipulating JSON objects by path
export function setJsonValueAtPath(root: any, path: (string | number)[], newValue: any) {
  // Work on a deep clone to avoid mutating the original reference
  let obj = JSON.parse(JSON.stringify(root === undefined ? null : root));

  if (!path || path.length === 0) {
    // Replace whole document
    return newValue;
  }

  // If top-level is expected to be an array but current root isn't, replace root with an array
  if (typeof path[0] === "number" && !Array.isArray(obj)) {
    obj = [];
  }

  let current: any = obj;
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    const isLast = i === path.length - 1;

    if (typeof seg === "number") {
      // Ensure current is an array
      if (!Array.isArray(current)) {
        // replace the current container with an array if it wasn't one
        // this happens when types were unexpected; create an array and continue
        // NOTE: This can lose previous object keys on this branch, but parser produces JSON structures so it's acceptable.
        // If current was referenced from a parent, it already points to that parent property.
        // When current is the top-level, we've already set obj to an array above.
        // Fallback: set as array
        // eslint-disable-next-line no-console
        current = [];
      }

      if (isLast) {
        current[seg] = newValue;
      } else {
        if (current[seg] === undefined || current[seg] === null) {
          // Create next container
          current[seg] = typeof path[i + 1] === "number" ? [] : {};
        } else {
          // shallow clone the child to avoid mutating original references
          current[seg] = Array.isArray(current[seg]) ? [...current[seg]] : { ...current[seg] };
        }
        current = current[seg];
      }
    } else {
      // seg is string key
      if (isLast) {
        current[seg] = newValue;
      } else {
        if (current[seg] === undefined || current[seg] === null) {
          current[seg] = typeof path[i + 1] === "number" ? [] : {};
        } else {
          current[seg] = Array.isArray(current[seg]) ? [...current[seg]] : { ...current[seg] };
        }
        current = current[seg];
      }
    }
  }

  return obj;
}

export default {
  setJsonValueAtPath,
};
