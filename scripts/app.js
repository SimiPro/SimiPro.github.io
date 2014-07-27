var span = document.getElementsByTagName('span')[0];
span.textContent = 'the amazing';
span.style.display = 'inline';
// create a new element, style it, and append it to the DOM
var loadTime = document.createElement('div');
loadTime.textContent = 'You loaded this page on: ' + new Date();
loadTime.style.color = 'blue';
document.body.appendChild(loadTime)