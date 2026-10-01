export function createPlaceholderResponse(moduleName, resourceId) {
  return {
    data: resourceId ? { id: resourceId } : null,
    meta: {
      apiVersion: "v1",
      module: moduleName,
      placeholder: true,
      message:
        "This API module is a placeholder; no business operation was performed.",
    },
  };
}
