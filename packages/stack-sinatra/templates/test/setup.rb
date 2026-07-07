ENV["RACK_ENV"] = "test"

require "minitest/autorun"
require "rack/test"
require "json"
require_relative "../lib/app"

# Base test case: Rack::Test wired to the app, with fresh in-memory stores per
# test. Generated resource tests should subclass this (`class UserTest < AppTest`).
class AppTest < Minitest::Test
  include Rack::Test::Methods

  def app
    App
  end

  def setup
    reset_stores!
  end

  # POST a Ruby hash as a JSON body.
  def post_json(path, data)
    post path, data.to_json, { "CONTENT_TYPE" => "application/json" }
  end

  # DELETE helper (Rack::Test provides get/post/put/delete).
  def delete_json(path)
    delete path
  end
end
