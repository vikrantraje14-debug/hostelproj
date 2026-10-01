import { createPlaceholderResponse } from "../services/placeholder.service.js";

export function placeholderController(moduleName) {
  return function sendPlaceholder(request, response) {
    const resourceId = request.validated?.params?.id;
    response
      .status(200)
      .json(createPlaceholderResponse(moduleName, resourceId));
  };
}
