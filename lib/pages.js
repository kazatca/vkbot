

function Pages(vk) {
  this.vk = vk
}

module.exports = Pages;

Pages.prototype.create = function(group_id, title, text) {
  return this.vk.api('pages.save', {
    text: text,
    group_id: group_id,
    title: title
  })
};