require_relative "setup"

class SmokeTest < AppTest
  def test_health
    get "/health"
    assert_equal 200, last_response.status
    assert_equal "ok", JSON.parse(last_response.body)["status"]
  end
end
