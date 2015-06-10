(function () {
    "use strict";

    var currentDate = "";
    var dateArray = [];
    var showDateArray = [];

    WinJS.UI.Pages.define("/pages/home/home.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            // TODO: Initialize the page here.
            document.getElementById("pobierzWaluty").addEventListener('click', this.getWalutyHandler, false);//pobierz waluty
            document.getElementById("exitApp").addEventListener('click', function a() { window.close(); }, false);//zakoncz aplikacje

            this.loadFileList();

            //przywraca session storage jezeli apka była : 
            if (WinJS.Application.sessionState.previousExecutionState === Windows.ApplicationModel.Activation.ApplicationExecutionState.terminated ||//terminated i byl suspend
                WinJS.Application.sessionState.previousExecutionState === Windows.ApplicationModel.Activation.ApplicationExecutionState.suspended || //suspened
                WinJS.Application.sessionState.previousExecutionState === Windows.ApplicationModel.Activation.ApplicationExecutionState.notRunning) { //notruning np bo przeszsła do innej strony
                currentDate = WinJS.Application.sessionState.currentDate;
                if (currentDate) {
                    document.getElementById("infoData").innerHTML = "Data: " + currentDate;
                }
            }
        },
        //pobieranie dat
        loadFileList: function () {
            //var dateCount = document.getElementById("dateCount");//dodatkowe info czego ile pobrano
            var output = document.getElementById("daty");//div na tablicę

            dateArray = [];
            showDateArray = [];

            //ajax query
            WinJS.xhr({ url: "http://www.nbp.pl/kursy/xml/dir.txt", responseType: "text" }).done(
                function complete(result) {
                    var arrayResponse = result.responseText.split('\r\n');
                    arrayResponse.reverse();
                    //HTMLdatesTable wrzuci i wyświetli w divie
                    var HTMLdatesTable = "<table id=\"tableDaty\"><th>Daty</th>";
                    //dodajemy do tablic nowe daty
                    for (var i = 0; i < arrayResponse.length; i+=2) {
                        if (arrayResponse[i].substr(0, 1) == 'a') {
                            dateArray.push(arrayResponse[i]);
                            showDateArray.push("20" + arrayResponse[i].substr(5, 2) + "-" + arrayResponse[i].substr(7, 2) + "-" + arrayResponse[i].substr(9, 2));
                            HTMLdatesTable += "<tr><td><a class=\"dateW\">20" + arrayResponse[i].substr(5, 2) + "-" + arrayResponse[i].substr(7, 2) + "-" + arrayResponse[i].substr(9, 2) + "</td></tr>";
                        }
                    }
                    HTMLdatesTable += "</table>";
                    output.innerHTML = window.toStaticHTML(HTMLdatesTable);

                    //dodaj do session storage date żeby przywrócić 
                     if (!WinJS.Application.sessionState.currentDate) {
                        currentDate = showDateArray[showDateArray.length - 1];
                        WinJS.Application.sessionState.currentDate = currentDate;
                        document.getElementById("infoData").innerHTML = " Data: " + currentDate;
                    } 

                    //listener na każdą datę
                    WinJS.Utilities.query(".dateW").listen("click", dateWa, false);

                    
                }, function error(error) {
                    output.innerHTML = "Got error: " + error.statusText;
                    // output.style.backgroundColor = "#FF0000";
                }, function progress(result) {
                    //output.innerText = "Ready state is " + result.readyState;
                    output.innerText = "Ładowanie... ";
                    //  output.style.backgroundColor = "#0000FF";
                });
        },
        //handler dla pobierania walut
        getWalutyHandler: function (eventInfo) {
            var tmp;
            for (var i = 0; i < showDateArray.length; i++) {
                if (showDateArray[i] == currentDate) {
                    tmp = i;
                }
            }
            var myURL = "http://www.nbp.pl/kursy/xml/" + dateArray[tmp] + ".xml";
            WinJS.xhr({ url: myURL }).then(
                function (result) {
                    var output = document.getElementById("waluty");
                    var xml = result.responseXML;
                    var items = xml.querySelectorAll('tabela_kursow');
                    //var outText = "<table id=\"tableWaluty\"><tr><td>Data publikacji: " + items[0].querySelector("data_publikacji").textContent + "</td>";
                    var outText = "<table class='table table-bordered'><tr><th>Kod Waluty</th><th>Nazwa Waluty</th><th>Kurs Średni</th><th>Kod Waluty</th><th>Nazwa Waluty</th><th>Kurs Średni</th></tr>";
                    items = xml.querySelectorAll('tabela_kursow > pozycja');
                    for (var i = 0; i < items.length-1; i+=2) {
                        outText += "<tr><td><a class=\"symbolW\">" + items[i].querySelector("kod_waluty").textContent + "</a></td><td>" + items[i].querySelector("nazwa_waluty").textContent + "</td><td>" + items[i].querySelector("kurs_sredni").textContent + "</td><td><a class=\"symbolW\">" + items[i+1].querySelector("kod_waluty").textContent + "</a></td><td>" + items[i+1].querySelector("nazwa_waluty").textContent + "</td><td>" + items[i+1].querySelector("kurs_sredni").textContent + "</td></tr>";
                    }
                    outText += "</table>";
                    output.innerHTML = window.toStaticHTML(outText);
                    WinJS.Utilities.query(".symbolW").listen("click", symbolW, false);
                }, function (result) {
                    document.getElementById("waluty").innerText = "Nie udalo sie pobrac. Kod bledu: " + result.status;
                });
        }
    });

    function dateWa(eventInfo) {
        eventInfo.preventDefault();
        currentDate = eventInfo.target.innerHTML;
        WinJS.Application.sessionState.currentDate = currentDate;
        document.getElementById("infoData").innerHTML = "Data: " + eventInfo.target.innerHTML;
        var x = document.getElementsByClassName("dateW");
        var i;
        for (i = 0; i < x.length; i++) {
            x[i].style.color = "black";
        }
        eventInfo.target.style.color = "green";
    }

    function symbolW(eventInfo) {
        eventInfo.preventDefault();
        WinJS.Navigation.navigate("/pages/chartView/ChartView.html", { symbol: eventInfo.target.innerHTML, data: currentDate });
    }

})();
