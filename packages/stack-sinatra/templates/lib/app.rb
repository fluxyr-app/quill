# Application factory.
#
# Resources and models are auto-discovered: drop a new file under lib/resources/
# that calls `Resources.define { |app| app.get(...) { ... } }`, and a model under
# lib/models/, and they are wired up automatically — no edits here required.
require "sinatra/base"
require "json"

# Collects route-definition blocks from lib/resources/*.rb and applies them to the
# app class. This is the auto-registration layer (mirrors Flask blueprints / Node
# routers).
module Resources
  @blocks = []
  class << self
    def define(&block)
      @blocks << block
    end

    def register(app)
      @blocks.each { |b| b.call(app) }
    end
  end
end

def _require_glob(subdir)
  Dir[File.join(__dir__, subdir, "*.rb")].sort.each { |f| require f }
end

# Load support code before routes: utilities (e.g. the short-ID codec), the auth
# helper module, then models (base first, by sort order).
_require_glob("utils")
_require_glob("middleware")
_require_glob("models")

class App < Sinatra::Base
  helpers Auth if defined?(Auth)

  helpers do
    # Serialize an object as a JSON response.
    def json(obj)
      content_type :json
      obj.to_json
    end

    # Parse the request body as JSON (returns {} on empty/invalid input).
    def parsed_body
      raw = request.body.read
      raw.empty? ? {} : JSON.parse(raw)
    rescue JSON::ParserError
      {}
    end
  end
end

# Resource files call Resources.define { |app| ... }; register them onto App.
_require_glob("resources")
Resources.register(App)
