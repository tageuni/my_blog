(function () {
  var input = document.getElementById('search-input');
  var resultsBox = document.getElementById('search-results');
  var scriptTag = document.currentScript;
  if (!input || !resultsBox || !scriptTag) return;

  var basePath = scriptTag.getAttribute('data-base-path') || '';
  var indexData = null;
  var indexPromise = null;
  var debounceTimer = null;

  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = fetch(basePath + '/search-index.json')
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        indexData = data;
        return data;
      })
      .catch(function () {
        indexData = [];
        return indexData;
      });
    return indexPromise;
  }

  function renderResults(matches, query) {
    resultsBox.innerHTML = '';
    if (!query) {
      resultsBox.hidden = true;
      return;
    }
    if (!matches.length) {
      var empty = document.createElement('li');
      empty.className = 'search-empty';
      empty.textContent = '검색 결과가 없습니다.';
      resultsBox.appendChild(empty);
      resultsBox.hidden = false;
      return;
    }
    matches.slice(0, 20).forEach(function (post) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = basePath + post.url;
      a.textContent = post.title;
      var meta = document.createElement('div');
      meta.className = 'search-result-meta';
      meta.textContent = post.date + (post.tags.length ? ' · ' + post.tags.join(', ') : '');
      a.appendChild(meta);
      li.appendChild(a);
      resultsBox.appendChild(li);
    });
    resultsBox.hidden = false;
  }

  function runSearch(rawQuery) {
    var query = rawQuery.trim().toLowerCase();
    if (!query) {
      renderResults([], '');
      return;
    }
    loadIndex().then(function (data) {
      var matches = data.filter(function (post) {
        return post.title.toLowerCase().indexOf(query) !== -1 || post.content.indexOf(query) !== -1;
      });
      matches.sort(function (a, b) {
        var aTitle = a.title.toLowerCase().indexOf(query) !== -1;
        var bTitle = b.title.toLowerCase().indexOf(query) !== -1;
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
        return 0;
      });
      renderResults(matches, query);
    });
  }

  input.addEventListener('focus', loadIndex);
  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var value = input.value;
    debounceTimer = setTimeout(function () {
      runSearch(value);
    }, 150);
  });

  document.addEventListener('click', function (event) {
    if (!resultsBox.contains(event.target) && event.target !== input) {
      resultsBox.hidden = true;
    }
  });
})();
