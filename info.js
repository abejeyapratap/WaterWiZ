////////////// When the info page loads //////////////
var currLoc = location.href.split('#')[1];

//////////////////////////////////////////////////////

function getLoc() {
    if (location.href.split('#')[1] && isNaN(location.href.split('#')[1])) {
        currLoc = location.href.split('#')[1];
    }
    return currLoc;
}

function fillStat(i) {
  switch (i) {
    case 0:
      document.getElementsByClassName('infoText')[0].innerHTML = "It's working :D";
      break;
  
    default:
      break;
  }
  let temp = getLoc();
  setTimeout(() => {location.href = "#" + temp}, 10);
}