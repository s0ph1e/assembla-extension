/**
 * ������� ������������� ������������ ����
 *
 * ������� �������� ������ � ������������� ��������
 * � ������� ��������������� ����������.
 */
function init() {

    var bg = chrome.extension.getBackgroundPage();
    document.getElementById('content').innerHTML = bg.AssemblaEvents.getData();
    
    if (bg.AssemblaEvents.CONNECTION_STATUS == true) {
       if (bg.AssemblaEvents.EVENTS_COUNT > 0) {
           var lastEvent = bg.AssemblaEvents.getLastReadEvent();
           localStorage.setItem('lastReadEvent', lastEvent);
       }
       bg.AssemblaEvents.checkEvents();
    }
}

window.onload = init;