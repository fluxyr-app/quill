# Health check resource. Also serves as the reference shape for a resource file:
# one `Resources.define` block that declares full route paths on `app`.
Resources.define do |app|
  app.get "/health" do
    json(status: "ok")
  end
end
