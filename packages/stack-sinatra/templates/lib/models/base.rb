require "securerandom"
require "time"
require "json"

# In-memory stores, one per model class (keyed by class name). Kept simple and
# dependency-free so the app runs with zero external services.
STORES = Hash.new { |h, k| h[k] = {} }

# Reset every in-memory store (used by tests between cases).
def reset_stores!
  STORES.clear
end

# Base class for resources: a UUID `id`, `created_at`/`updated_at` timestamps, and
# simple persistence backed by the in-memory store. Extend it; do not reimplement
# these. Ids are stored as full UUID strings; `to_hash` shortens `id` and any
# `*_id` field at the serialization boundary (see the short-ID codec).
class BaseModel
  attr_accessor :id, :created_at, :updated_at

  def initialize(attrs = {})
    @id = SecureRandom.uuid
    now = Time.now.utc.iso8601
    @created_at = now
    @updated_at = now
    attrs.each { |k, v| public_send("#{k}=", v) if respond_to?("#{k}=") }
  end

  def save
    @updated_at = Time.now.utc.iso8601
    STORES[self.class.name][@id] = self
    self
  end

  def destroy
    STORES[self.class.name].delete(@id)
  end

  def self.find_by_id(id)
    STORES[name][id]
  end

  def self.all
    STORES[name].values
  end

  # Serialize to a Hash, emitting short IDs for `id` and any `*_id` field.
  def to_hash
    result = {}
    instance_variables.each do |ivar|
      key = ivar.to_s.delete("@")
      value = instance_variable_get(ivar)
      if (key == "id" || key.end_with?("_id")) && value.is_a?(String)
        value = ShortId.shorten(value)
      end
      result[key] = value
    end
    result
  end

  def to_json(*_args)
    to_hash.to_json
  end
end
