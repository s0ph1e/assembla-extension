/** 
 * Названия месяцев
 */
var months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/**
 * Объект новых событий
 *
 * @return  string  URL Адрес сайта
 * @return  string  EVENTS_URL  Адрес страницы событий
 * @return  array   YELLOW  Желтый цвет баджа
 * @return  array   GREEN   Зеленый цвет баджа
 * @return  array   GREY    Серый цвет баджа
 * @return  int     INTERVAL_BETWEEN_CHECK  Интервал между получением данных с сайта
 * @return  int     EVENTS_COUNT    Количество непрочитанных событий
 * @return  array   EVENTS  Непрочитанные события
 * @return  bool    CONNECTION_STATUS   Статус соединения
 * @return  bool    LOGIN_STATUS    Статус авторизации
 * @return  function    init    Функция инициализации
 * @return  function    checkEventsAfterTimeout Запуск проверки собитый по таймауту
 * @return  function    checkEvents Функция проверки непрочитанных событий
 * @return  function    handleError Функция обработки отсутствия соединения
 * @return  function    getData Функция получения данных для вывода в popup
 * @return  function    getLastReadEvent  Функция получения последнего прочитанного события
 * @return  function    getUnreadEvents   Функция получения непрочитанных событий
 * @return  function    createEventString   Функция формирования строки события
 */
var AssemblaEvents = (function() {

    return {
        URL: 'https://www.assembla.com',
        EVENTS_URL: 'https://www.assembla.com/activity',
        YELLOW: [255, 240, 1, 255],
        GREEN: [48, 255, 0, 255],
        GREY: [100, 100, 100, 255],
        INTERVAL_BETWEEN_CHECK: 10000,
        EVENTS_COUNT: 0,
        EVENTS: [],
        CONNECTION_STATUS: true,
        LOGIN_STATUS: false,
        
        /**
         * Функция инициализации
         *
         * Проверяет количество непрочитанных событий, 
         * запускает проверку по таймауту.
         * Если в localStorage нет переменной непрочитанного 
         * события, то устанавливает ее.
         */
        init: function() {
            AssemblaEvents.checkEvents();
            AssemblaEvents.checkEventsAfterTimeout();
            
            if (!localStorage.getItem('lastReadEvent')) {
                var lastEvent = AssemblaEvents.getLastReadEvent();
                localStorage.setItem('lastReadEvent', lastEvent);
            }
        },
        
        /**
         * Функция запуска проверки событий по таймауту
         *
         * Интервал определяется в свойстве INTERVAL_BETWEEN_CHECK.
         */
        checkEventsAfterTimeout: function() {
            window.setTimeout(
                function() {
                    AssemblaEvents.checkEvents();
                    AssemblaEvents.checkEventsAfterTimeout();
                },
                AssemblaEvents.INTERVAL_BETWEEN_CHECK
            );
        },
        
        /**
         * Функция проверки непрочитанных событий
         *
         * Через интервал времени (заданный в свойстве INTERWAL_BETWEEN_CHECK)
         * получает данные со страницы событий сайта и изменяет в соответствии 
         * с данными бадж.
         */
        checkEvents: function() {
            var xhr = new XMLHttpRequest();
            try {
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4) {    // данные загружены
                        clearTimeout(timeout);
                        var response = xhr.response;
                        
                        if (response.match(/<div class=\"app-login\"/)) {    // если не залогинен
														console.log('not logged in');
                            AssemblaEvents.CONNECTION_STATUS = true;
                            AssemblaEvents.LOGIN_STATUS = false;
                            chrome.browserAction.setBadgeBackgroundColor({color: AssemblaEvents.YELLOW});
                            chrome.browserAction.setBadgeText({text: '!'});
                            chrome.browserAction.setTitle({title: 'You must login to Assembla'});
                            return;
                        } else if (response.match(/<span class="user-name/)) {        // если залогинен
                            AssemblaEvents.CONNECTION_STATUS = true;
                            AssemblaEvents.LOGIN_STATUS = true;
                            var events = response.match(/<tr.*?\/tr>/ig);        // получаем все tr из таблицы событий
                            var lastReadEvent = localStorage.getItem('lastReadEvent');  // получение последнего прочитанного события
                            AssemblaEvents.EVENTS = AssemblaEvents.getUnreadEvents(lastReadEvent, events);  // получение непрочитанных
                            AssemblaEvents.EVENTS_COUNT = AssemblaEvents.EVENTS.length;        // количество непрочитанных событий
                            chrome.browserAction.setBadgeBackgroundColor({color: AssemblaEvents.GREEN});
                            chrome.browserAction.setBadgeText({text: AssemblaEvents.EVENTS_COUNT.toString()});
                            chrome.browserAction.setTitle({title: 'You have ' + AssemblaEvents.EVENTS_COUNT.toString() + ' unread messages.'});
                        }
                    }
                };
                xhr.onerror = function(error) {
                    AssemblaEvents.handleError();
                };
                xhr.open('GET', AssemblaEvents.EVENTS_URL, true);
                xhr.send(null);
                var timeout = setTimeout( function(){
                    Console.error('Timeout error!');
                    xhr.abort();
                    AssemblaEvents.handleError();
                }, AssemblaEvents.INTERVAL_BETWEEN_CHECK);
            } catch(e) {
                Console.error(e);
                AssemblaEvents.handleError();
            }
        },
        
        /**
         * Функция для обработки отсутсвия соединения с ассемблой
         * 
         * Изменяет цвет и текст баджа.
         */ 
        handleError: function() {
            AssemblaEvents.CONNECTION_STATUS = false;
            chrome.browserAction.setBadgeBackgroundColor({color: AssemblaEvents.GREY});
            chrome.browserAction.setBadgeText({text: '?'});
            chrome.browserAction.setTitle({title: 'No connection'});
        },
        
        /**
         * Функция которая формирует данные для вывода в popup
         *
         * Если есть соединение, пользователь авторизирован и 
         * есть непрочитанные события, то возвращает их, иначе 
         * возвращает соответстующее сообщение.
         * 
         * @return   string Возвращает непрочитанные события,
         *                  или сообщение об ошибке.
         */
        getData: function() {
            // Если соединение установлено
            if (AssemblaEvents.CONNECTION_STATUS == true) {
                // Если пользователь авторизирован
                if (AssemblaEvents.LOGIN_STATUS == true) {
                    // Есть события
                    if (AssemblaEvents.EVENTS_COUNT > 0) {
                        return AssemblaEvents.EVENTS.join('\n');
                    } else {
                        return '<p><b> No new events.</b></p>';
                    }
                } else {    // Не залогинен - ссылка на вход
                    var loginLink = AssemblaEvents.URL + '/login';
                    return '<p><b>You must <a href =' + loginLink + ' target = "_blank">login</a> to Assembla.</b></p>';
                }
            } else {    // Нет соединения
                return '<p><b> No connection.</b></p>';
            }
        },
        
        /**
         * Функция получения последнего прочитанного события
         * 
         * Если были непрочитанные события, то возвращаем последнее из них,
         * если не было - то возвращаем стандартную строку.
         *
         * @return  string  Возвращает строку события или стандартную строку
         */
        getLastReadEvent: function() {
            if (AssemblaEvents.EVENTS_COUNT > 0) {  // если события есть - то последнее, если нету - то возвращаем строку со всякой ерундой
                return AssemblaEvents.EVENTS[0];   
            } else return 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diem nonummy nibh euismod tincidunt ut lacreet dolore magna aliguam erat volutpat.';
        },
        
        /**
         * Функция получения непрочитанных событий
         * 
         * Формирует массив непрочитанных событий путем сравнения с последним
         * прочитанным событием. При первом совпадении с прочитанным событием
         * выполнение функции прерывается.
         *
         * @param   string  $lastReadEvent    Последнее прочитанное событие
         * @param   Array   $events             Все события, полученные со страницы событий
         * @return  Array                       Возвращает массив непрочитанных событий
         */
        getUnreadEvents: function(lastReadEvent, events) {
            var result = [];
            var datetime = new Date();
            var date;
            var time;
           
            for (var i in events) { 
                if (date = events[i].match(/\d{4}-\d{2}-\d{2}/)) {    // если строка даты
                    var dateArray = date[0].split('-');
                    datetime.setYear(dateArray[0]);
                    datetime.setMonth(dateArray[1]-1);
                    datetime.setDate(dateArray[2]);
                } else if (time = events[i].match(/\d{2}:\d{2}/)) {    // если строка события
                    var timeArray = time[0].split(':');
                    datetime.setHours(timeArray[0]);
                    datetime.setMinutes(timeArray[1]);
                    var dateString = datetime.getDate() + ' ' + months[datetime.getMonth()];
                    var eventString = AssemblaEvents.createEventString(dateString, events[i]);
                    // если новое событие, то добавляем
                    if (eventString != lastReadEvent) {
                        result.push(eventString);
                    } else break;   // если встретили прочитанное событие - выходим из цикла
                } 
            }
            return result;
        },
        
        /**
         * Функция формирования строки для вывода
         *
         * @param   string  $date   Дата события
         * @param   string  $event  Текст события
         */
        createEventString: function(date, event) {
            var tmp;
            
            var tagsRegExp = /(<([^>]+)>)/ig;       // регулярное выражение для тегов
            var time = event.match(/<td class=\"hour"\>.*?<\/td>/)[0].replace(tagsRegExp,'');   // время
            
            var name;
            var nameLink;
            tmp = event.match(/<a.*? rel=\"fancybox\">(.*?)<\/a>/);
            if (tmp != null) {
                name = tmp[1];           // строка имени
                nameLink = AssemblaEvents.URL + name.split('"')[1];                 // ссылка на профиль
            } else {
                name = 'User deleted';
            }
            var spaceSymbol = event.match(/<span class=\"space-symbol\">.*?<\/span>/);  // символ @
            var space = event.match(/<a href=\"\/spaces.*?>.*?<\/a>/)[0];               // строка пространства
            var spaceLink = AssemblaEvents.URL + space.split('"')[1];               // ссылка на пространства
            space = space.replace(tagsRegExp,'');                                   // пространство
            
            var action = event.match(/<em>.*?<\/em>/);                      // действие
            var actionLink;
            tmp = event.match(/<a href=\"https(.*?)\" class=\"itemlink\">/);
            if (tmp != null) {
                actionLink = 'https' + event.match(/<a href=\"https(.*?)\" class=\"itemlink\">/)[1];
            }
            var allEvent = event.replace(tagsRegExp,' ');
            var description = allEvent.substring(allEvent.indexOf('(а)') + 3);
            
            var result = '<p><span class = "date">' + date  + time + ' </span>'; // записываем дату, время
            if (!nameLink) {
                result += '<span class = "name">' + name + ' </span>';
            } else {
                result += '<a class = "name" href = "' + nameLink + '" target="_blank">' + name + ' </a>';   // записываем имя и ссылку
            }
            result += spaceSymbol + ' '; // знак @
            result += '<a class = "space" href = "' + spaceLink + '" target="_blank">' + space + ' </a>';       // имя простронства
            if (!actionLink) {
                result += '<span class = "action">' + action + ' ' + description + '</span></p>'; 
            } else {
                result += '<a class = "action" href = "' + actionLink + '" target="_blank">' + action + ' ';     // действие (добавил, пригласил и т.д)
                result += description + '</a></p>'; // описание коммита
            }
            return result;
        }
    }
})();

AssemblaEvents.init();