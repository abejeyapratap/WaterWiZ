////////////// When the info page starts loading //////////////
var currLoc = location.href.split('#')[1];
var locID = -1;

var statData;
var statInfo;

var ready = 0;

$.getJSON("data/statInfo.json", function(sij) {
  statInfo = sij;
  $.getJSON("data/statData.json", function(sdj) {
    statData = sdj;
    ready++;
    if (ready >= 2) {
      allLoaded();
    }
  });
});
///////////////////////////////////////////////////////////////

function pageLoaded() {
  ready++;
    if (ready >= 2) {
      allLoaded();
    }
}

function allLoaded() {
  locID = -1;
  for (i = 0; i < statData.suppliers.length; i++) {
    if (statData.suppliers[i].id == getLoc()) {
      locID = i;
      break;
    }
  }

  if (locID == -1) {
    location.href = 'index.html';
    return;
  }

  document.getElementById('infoTitle').innerHTML = statData.suppliers[locID].name;
  document.getElementById('infoCounties').innerHTML = statData.suppliers[locID].counties;
  document.getElementById('infoSubheader').innerHTML = statData.suppliers[locID].waterStatus;
  if (statData.suppliers[locID].waterStatus.includes('Good')) {
    document.getElementById('infoSubheader').style = 'background-color: rgb(72, 255, 0)';
  } else if (statData.suppliers[locID].waterStatus.includes('Fair')) {
    document.getElementById('infoSubheader').style = 'background-color: yellow';
  } else if (statData.suppliers[locID].waterStatus.includes('Poor')) {
    document.getElementById('infoSubheader').style = 'background-color: red';
  }

  document.getElementsByClassName('infoText')[0].innerHTML = statData.suppliers[locID].description;

  setBar(0, statInfo.stats[0].lowThresh, statInfo.stats[0].highThresh, statData.suppliers[locID].stats[0]);
  setBar(1, statInfo.stats[1].lowThresh, statInfo.stats[1].highThresh, statData.suppliers[locID].stats[1]);
  setBar(2, statInfo.stats[2].lowThresh, statInfo.stats[2].highThresh, statData.suppliers[locID].stats[2]);
  setBar(3, statInfo.stats[3].lowThresh, statInfo.stats[3].highThresh, statData.suppliers[locID].stats[3]); 
}

function getLoc() {
    if (location.href.split('#')[1] && isNaN(location.href.split('#')[1])) {
        currLoc = location.href.split('#')[1];
    }
    return currLoc;
}

function setBar(stat, low, high, current) {
  // low  216 154
  // high 150 224
  document.getElementsByClassName('barTitle')[stat].innerHTML = statInfo.stats[stat].name;
  var bars = document.getElementsByClassName('bar');
  var height = current;
  var color = statInfo.stats[stat].color;

  let scale = high - low;
  let value = (current - low) / scale;
  let h = (220 - 154) * value;
  height = h + 154;

  if (height < 50) {
    height = 50;
  }
  if (height > 360) {
    height = 360;
  }

  bars[stat * 3].style = `height: ${370 - height}`;
  bars[stat * 3 + 1].style = `height: ${height}; background-color: ${color}`;
  bars[stat * 3 + 2].style = `height: ${height - 2}`;
  
}

function fillStat(i) {
  document.getElementById('infoHeader').innerHTML = statInfo.stats[i].name;
  let subheader = '';
  if (statData.suppliers[locID].stats[i] > statInfo.stats[i].fairLowThresh && statData.suppliers[locID].stats[i] < statInfo.stats[i].fairHighThresh) {
    subheader = 'Good';
    document.getElementById('infoSubheader').style = 'background-color: rgb(72, 255, 0)';
    document.getElementsByClassName('infoText')[0].innerHTML = statInfo.stats[i].GoodMsg;
  } else if (statData.suppliers[locID].stats[i] > statInfo.stats[i].lowThresh && statData.suppliers[locID].stats[i] < statInfo.stats[i].highThresh) {
    subheader = 'Fair';
    document.getElementById('infoSubheader').style = 'background-color: yellow';
    document.getElementsByClassName('infoText')[0].innerHTML = statInfo.stats[i].FairMsg;
  } else if (statData.suppliers[locID].stats[i] <= statInfo.stats[i].lowThresh) {
    subheader = 'Low';
    document.getElementById('infoSubheader').style = 'background-color: red';
    document.getElementsByClassName('infoText')[locID].innerHTML = statInfo.stats[i].LowMsg;
  } else {
    subheader = 'High';
    document.getElementById('infoSubheader').style = 'background-color: red';
    document.getElementsByClassName('infoText')[0].innerHTML = statInfo.stats[i].HighMsg;
  }
  document.getElementById('infoSubheader').innerHTML = subheader + ` - ${statData.suppliers[locID].stats[i]} ${statData.suppliers[locID].units[i]}`;

  let temp = getLoc();
  setTimeout(() => {location.href = "#" + temp}, 10);
}