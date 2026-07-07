# Authentication guard, mixed into the app as Sinatra helpers.
#
# `must_be_authed!` is a pass-through stub so the app runs out of the box while
# preserving the convention. Replace its body with real authentication
# (JWT/session) when wiring auth for production.
module Auth
  def must_be_authed!
    # no-op stub
  end
end
