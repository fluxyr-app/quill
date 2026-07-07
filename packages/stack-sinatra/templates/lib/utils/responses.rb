# Standard response helpers (top-level methods, callable from route blocks).

# Build a standardized error payload: {"error": {"message": ..., "code"?: ...}}.
def error_response(message, code = nil)
  err = { message: message }
  err[:code] = code if code
  { error: err }
end

# Build a success payload (identity — pass the data through).
def success_response(data)
  data
end
