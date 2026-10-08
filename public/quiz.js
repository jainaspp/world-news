(function () {
  var form = document.getElementById('quiz');
  if (!form) return;
  var score = form.querySelector('.quiz-score');
  var share = form.querySelector('.quiz-share');
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var questions = form.querySelectorAll('.quiz-question');
    var correct = 0;
    questions.forEach(function (question) {
      var reveal = question.querySelector('.quiz-reveal');
      var answer = reveal ? reveal.getAttribute('data-answer') || '' : '';
      var chosen = question.querySelector('input:checked');
      var chosenText = chosen ? (chosen.parentElement.querySelector('span') || {}).textContent || '' : '';
      question.querySelectorAll('.quiz-option').forEach(function (option) {
        var text = (option.querySelector('span') || {}).textContent || '';
        option.classList.toggle('is-correct', text.trim() === answer);
        option.classList.toggle('is-wrong', option.contains(chosen) && text.trim() !== answer);
      });
      if (chosenText.trim() === answer) correct += 1;
      if (reveal) reveal.hidden = false;
    });
    if (score) {
      score.hidden = false;
      score.textContent = '答對 ' + correct + ' 題，共 ' + questions.length + ' 題。';
    }
    if (share) {
      share.hidden = false;
      share.onclick = function () {
        var text = '世界頭條每日新聞小測：答對 ' + correct + ' 題，共 ' + questions.length + ' 題。 ' + location.origin + '/quiz/';
        if (navigator.share) navigator.share({ title: '每日新聞小測', text: text, url: location.origin + '/quiz/' }).catch(function () {});
        else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { share.textContent = '已複製成績'; });
        else prompt('分享成績', text);
      };
    }
    var submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
  });
})();
