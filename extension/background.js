importScripts("thumbnail.js");
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type !== "mdl_thumbnail") return false;
  // Only our content script in the Meta Library can request a raster asset.
  if (sender.id !== chrome.runtime.id || !sender.tab ||
      !/^https:\/\/www\.facebook\.com\/ads\/library(?:[/?#]|$)/.test(sender.url || "")) {
    reply({ thumbnail_error: "cors_or_download" }); return false;
  }
  chrome.storage.local.get(["mdlPlan"]).then((data) => {
    if (data.mdlPlan !== "admin") throw new Error("cors_or_download");
    return mdlFetchCreative(message.url);
  }).then(mdlBlobThumbnail)
    .then((thumbnail) => reply({ thumbnail }))
    .catch((error) => reply({ thumbnail_error: error.message === "too_large" ? "too_large" : "cors_or_download" }));
  return true;
});