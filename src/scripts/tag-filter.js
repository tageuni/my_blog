(function () {
  var bar = document.querySelector('.tag-filter-bar');
  if (!bar) return;

  var chips = Array.prototype.slice.call(bar.querySelectorAll('.tag-filter-chip'));
  var items = Array.prototype.slice.call(document.querySelectorAll('.post-item'));

  function applyFilter(tag) {
    items.forEach(function (item) {
      if (!tag) {
        item.hidden = false;
        return;
      }
      var tags = (item.getAttribute('data-tags') || '').split(',');
      item.hidden = tags.indexOf(tag) === -1;
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) {
        c.classList.remove('is-active');
      });
      chip.classList.add('is-active');
      applyFilter(chip.getAttribute('data-tag'));
    });
  });
})();
