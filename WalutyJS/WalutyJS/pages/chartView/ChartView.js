// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";
    var listaWalutaHelper = [];//lista obiektów {url:,data:,wartosc:}
    var startdate;
    var finishdate;
    var records = [];//lista rekordów do rysowania
    var SYMBOL_WALUTY;
    var listaDoPobrania = [];//lista dla dat kursów które nie były pobrane jeszcze

    WinJS.UI.Pages.define("/pages/chartView/ChartView.html", {
        ready: function (element, options) {

            //ustawia napisy przesłane z poprzedniej strony 
            SYMBOL_WALUTY = options.symbol.toString();
            //document.getElementById("Wtitle").innerHTML = "Historia waluty " + options.symbol.toString().toUpperCase();
            //document.getElementById("poczatkowa").innerHTML = options.data.toString();
            startdate = options.data.toString();
            //ładuje tabelki z datami 
            this.loadFileList();
            document.getElementById("rysuj").addEventListener('click', this.generujPunktyRysowania, false);//pobierz daty
            document.getElementById("zapisz").addEventListener('click', this.zapisz, false);//pobierz daty
            document.getElementById("dataPoczatkowa").addEventListener('change', this.sprawdzDate, false);//sprawdz date
            document.getElementById("dataKoncowa").addEventListener('change', this.sprawdzDate, false);//sprawdz date
            rysuj();
        },

        sprawdzDate: function () {
            var dPoczatkowa;
            var dKoncowa;
            dPoczatkowa = document.getElementById("dataPoczatkowa").winControl;
            dKoncowa = document.getElementById("dataKoncowa").winControl;
            if (dKoncowa.current > dPoczatkowa.current) {
                document.getElementById("errorLine").innerHTML = "Poprawna data";
            } else {
                document.getElementById("errorLine").innerHTML = "Data koncowa musi byc pozniejsza od koncowej";
                document.getElementById("rysuj").disabled = true;//wylacz button rysuj
            }

        },

        zapisz: function(){
            var Imaging = Windows.Graphics.Imaging;
            var picker = new Windows.Storage.Pickers.FileSavePicker();
            picker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
            picker.fileTypeChoices.insert("PNG file", [".png"]);
            var imgData, fileStream = null;
            picker.pickSaveFileAsync().then(function (file) {
                if (file) {
                    return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
                } else {
                    return WinJS.Promise.wrapError("No file selected");
                }
            }).then(function (stream) {
                fileStream = stream;
                var canvas = document.getElementById("myCanvas");
                var ctx = canvas.getContext("2d");
                imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                return Imaging.BitmapEncoder.createAsync(Imaging.BitmapEncoder.pngEncoderId, stream);
            }).done(function () {
                //Make sure to do this at the end
                fileStream.close();
            }, function () {
                //Empty error handler (do nothing if the user canceled the picker
            });
        },

        generujPunktyRysowania: function () {
            var dPoczatkowa;
            var dKoncowa;
            dPoczatkowa = document.getElementById("dataPoczatkowa").winControl;
            dKoncowa = document.getElementById("dataKoncowa").winControl;
            //Czyści wykres
            var canvas = document.getElementById("myCanvas");
            var context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);

            //informacja że wykres jest w trakcie ładowania
            document.getElementById("errorLine").innerHTML = "Oczekiwanie na wykres.";

            //czyścimy punkty ze starego rysowania
            listaDoPobrania = [];
            records = [];

            //jeżeli nie ma wartości kursu dla jakiejś daty wrzuca go id do listaDoPobrania
            var zacznijDodawacPunkty = false;
            var dayPoczatkowa = dPoczatkowa.current.getDate();
            var monthPoczatkowa = dPoczatkowa.current.getMonth() + 1;
            var yearPoczatkowa = dPoczatkowa.current.getFullYear();

            var dayKoncowa = dKoncowa.current.getDate();
            var monthKoncowa = dKoncowa.current.getMonth() + 1;
            var yearKoncowa = dKoncowa.current.getFullYear();

            var stringPoczatkowa;
            var stringKoncowa;

            //konwert string;
            stringPoczatkowa = yearPoczatkowa + "-";
            if (monthPoczatkowa < 10) {
                stringPoczatkowa = stringPoczatkowa +"0"+ monthPoczatkowa + "-";
            } else {
                stringPoczatkowa = stringPoczatkowa + monthPoczatkowa + "-";
            }
            if (dayPoczatkowa < 10) {
                stringPoczatkowa = stringPoczatkowa + "0" + dayPoczatkowa;
            } else {
                stringPoczatkowa = stringPoczatkowa + dayPoczatkowa;
            }
            var dTmpPoczatkowa = new Date(stringPoczatkowa);

            //konwert string;
            stringKoncowa = yearKoncowa + "-";
            if (monthKoncowa < 10) {
                stringKoncowa = stringKoncowa + "0" + monthKoncowa + "-";
            } else {
                stringKoncowa = stringKoncowa + monthKoncowa + "-";
            }
            if (dayKoncowa < 10) {
                stringKoncowa = stringKoncowa + "0" + dayKoncowa;
            } else {
                stringKoncowa = stringKoncowa + dayKoncowa;
            }
            var dTmpKoncowa = new Date(stringKoncowa);


            for (var i = 0; i < listaWalutaHelper.length; i++) {
                var dTmp = new Date(listaWalutaHelper[i].data.toString());
                if (dTmp >= dTmpPoczatkowa ) {
                    zacznijDodawacPunkty = true;
                }
                //jeżeli punkt jest potrzebny
                if (zacznijDodawacPunkty) {
                    //jeżeli punkt nie był jeszcze pobrany
                    if (listaWalutaHelper[i].wartosc == null) {
                        listaDoPobrania.push(i);
                    }
                }
                //jeżeli data końcowa przerwij
                if (dTmp >= dTmpKoncowa) {
                    zacznijDodawacPunkty = false;
                    break;
                }
            }

            //OBIEKT !!!! w którym są pola które wskazują na funkcje które pobiorą wszystkie potrzebne pliki z kursami
            var promises = {};
            for (var i = 0; i < listaDoPobrania.length; i++) {
                promises["fl" + listaDoPobrania[i]] = WinJS.xhr({ url: "http://www.nbp.pl/kursy/xml/" + listaWalutaHelper[listaDoPobrania[i]].url + ".xml" });
            }

            //czekaj na pobranie wszystkich plików dostaje obiekt ww
            WinJS.Promise.join(promises).done(
                //po ukończeniu pobierania wszystkich potrzebnych plików
                function complete(xhr) {
                    //wpisz do listaWalutaHelper[id].wartosc wszystkie pobrane wartości
                    for (var j = 0; j < listaDoPobrania.length; j++) {
                        var cResult = xhr["fl" + listaDoPobrania[j]].responseXML;
                        var items = cResult.querySelectorAll('tabela_kursow');
                        items = cResult.querySelectorAll('tabela_kursow > pozycja');
                        for (var i = 0; i < items.length; i++) {
                            if (items[i].querySelector("kod_waluty").textContent == SYMBOL_WALUTY)
                                listaWalutaHelper[listaDoPobrania[j]].wartosc = items[i].querySelector("kurs_sredni").textContent.replace(",", ".");
                        }
                    }

                    //dodajemy punkty do rysowania
                    var zacznijDodawacPunkty = false;
                    for (var i = 0; i < listaWalutaHelper.length; i++) {
                        var dTmp = new Date(listaWalutaHelper[i].data.toString());
                        if (dTmp >= dTmpPoczatkowa) {
                            zacznijDodawacPunkty = true;
                        }
                        //jeżeli to już data startowa dodawaj punkty do rysowania
                        if (zacznijDodawacPunkty) {
                            if (listaWalutaHelper[i].wartosc != null) {
                                records.push(listaWalutaHelper[i].wartosc);
                            }
                        }
                        //jeżeli data końcowa przerwij
                        if (dTmp >= dTmpKoncowa) {
                            zacznijDodawacPunkty = false;
                            break;
                        }
                    }
                    rysuj();
                    document.getElementById("errorLine").innerHTML = "Wykres załadowany.";
                }
        );


        },
        //pobieranie dat
        loadFileList: function () {
            //listaWalutaHelper []
            //{ url: nazwapliku, data: data, wartosc: wartosc}

            //zapytanie typu ajax 
            WinJS.xhr({ url: "http://www.nbp.pl/kursy/xml/dir.txt", responseType: "text" }).done(
                function complete(result) {
                    var arrayResponse = result.responseText.split('\r\n');
                    //dodajemy do tablic nowe daty
                    for (var i = 0; i < arrayResponse.length; i++) {
                        if (arrayResponse[i].substr(0, 1) == 'a') {
                            var dataFormatowana = "20" + arrayResponse[i].substr(5, 2) + "-" + arrayResponse[i].substr(7, 2) + "-" + arrayResponse[i].substr(9, 2);
                            listaWalutaHelper.push({ url: arrayResponse[i], data: dataFormatowana, wartosc: null });
                        }
                    }

                }, function error(error) {
                    document.getElementById("ErrorLine").innerHTML = "Got error: " + error.statusText;
                }, function progress(result) {
                    document.getElementById("errorLine").innerText = "Ładowanie pliku dat... ";
                }, function success(result) {
                    document.getElementById("errorLine").innerText = "Ładowanie pliku dat zakończone... ";
                });
        },
        unload: function () {
            // TODO: Respond to navigations away from this page.
        },
        updateLayout: function (element) {
            /// <param name="element" domElement="true" />
            // TODO: Respond to changes in layout.
        }
    });
    function dateStartListener(eventInfo) {
        eventInfo.preventDefault();
        startdate = eventInfo.target.innerHTML;
        document.getElementById("poczatkowa").innerHTML = startdate;
        var x = document.getElementsByClassName("dateStartListener");
        var i;
        for (i = 0; i < x.length; i++) {
            x[i].style.color = "aqua";
        }
        eventInfo.target.style.color = "magenta";
    }
    function dateStopListener(eventInfo) {
        eventInfo.preventDefault();
        finishdate = eventInfo.target.innerHTML;
        document.getElementById("koncowa").innerHTML = finishdate;
        var x = document.getElementsByClassName("dateStopListener");
        var i;
        for (i = 0; i < x.length; i++) {
            x[i].style.color = "aqua";
        }
        eventInfo.target.style.color = "magenta";
    }
    function rysuj() {

        var canvas = document.getElementById("myCanvas");
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        var margin = 40;
        var width = 600;
        var height = 500;

        var lewy = margin;
        var dol = height - margin;
        var gora = margin;
        var prawy = width - margin;
        var separator = 10;

        //linie wykresu
        context.beginPath();
        context.lineWidth = 2;
        context.strokeStyle = '#0000FF';
        context.moveTo(lewy, gora);
        context.lineTo(lewy, dol);
        context.stroke();
        context.moveTo(lewy, dol);
        context.lineTo(prawy, dol);
        context.stroke();

        //strzałki
        context.moveTo(lewy, gora);
        context.lineTo(lewy - 6, gora + 6);
        context.stroke();
        context.moveTo(lewy, gora);
        context.lineTo(lewy + 6, gora + 6);
        context.stroke();
        context.moveTo(prawy, dol);
        context.lineTo(prawy - 6, dol + 6);
        context.stroke();
        context.moveTo(prawy, dol);
        context.lineTo(prawy - 6, dol - 6);
        context.stroke();
        //Legenda kurs
        context.strokeStyle = '#000F00';
        context.lineWidth = 1;
        context.font = "14px Calibri";
        context.strokeText("K", 20, 150);
        context.strokeText("U", 20, 165);
        context.strokeText("R", 20, 180);
        context.strokeText("S", 20, 195);
        //Legenda Data
        context.font = "14px Calibri";
        context.strokeText("Data", 200, height - 20);

        //zmiana koloru
        context.closePath();
        context.beginPath();
        context.strokeStyle = '#FF0000';
        context.lineWidth = 1;
        var heightWykresu = height - margin - separator;
        var widthWykresu = width - 2 * margin;

        //obliczamy najmniejszy i największy
        var najmniejszy = records[0];
        var najwiekszy = records[0];
        for (var i = 0; i < records.length; i++) {
            if (records[i] < najmniejszy) {
                najmniejszy = records[i];
            }
            if (records[i] > najwiekszy) {
                najwiekszy = records[i];
            }
        }

        //współczynniki przez które pomnożony punkt otrzyma wysokość i szerokość
        var wspolczynnikSzerokosciPunktu = widthWykresu / (records.length - 1);
        var wspolczynnikWysokosciPunktu = (heightWykresu - margin - separator * 4) / (najwiekszy - najmniejszy);

        //punkt startowy
        var lastx = margin;
        var lasty = heightWykresu - (records[0] - najmniejszy) * wspolczynnikWysokosciPunktu;

        //kolejnt punkty z tablicy records
        for (var i = 1; i < records.length; i++) {
            context.moveTo(Math.round(lastx), Math.round(lasty));
            lastx = i * wspolczynnikSzerokosciPunktu + 40;
            lasty = heightWykresu - (records[i] - najmniejszy) * wspolczynnikWysokosciPunktu;
            context.lineTo(Math.round(lastx), Math.round(lasty));
            context.stroke();
        }

        //zmiana koloru
        context.closePath();
        context.beginPath();
        context.strokeStyle = '#00FFFF';

        //linia najwyższego kursu
        context.moveTo(Math.round(lewy), Math.round(heightWykresu - (najwiekszy - najmniejszy) * wspolczynnikWysokosciPunktu));
        context.lineTo(Math.round(prawy), Math.round(heightWykresu - (najwiekszy - najmniejszy) * wspolczynnikWysokosciPunktu));
        context.stroke();

        //linia najniższego kursu
        context.moveTo(Math.round(lewy), Math.round(heightWykresu - (najmniejszy - najmniejszy) * wspolczynnikWysokosciPunktu));
        context.lineTo(Math.round(prawy), Math.round(heightWykresu - (najmniejszy - najmniejszy) * wspolczynnikWysokosciPunktu));
        context.stroke();

        //opis najwyższego kursu
        context.strokeStyle = '#0F0F0F';
        context.lineWidth = 1;
        context.font = "12px Calibri";
        context.strokeText(najwiekszy, Math.round(lewy + widthWykresu / 2), Math.round(heightWykresu - (najwiekszy - najmniejszy) * wspolczynnikWysokosciPunktu) - 4);


        //opis najniższego kursu
        context.strokeStyle = '#0F0F0F';
        context.lineWidth = 1;
        context.font = "12px Calibri";
        context.strokeText(najmniejszy, Math.round(lewy + widthWykresu / 2), Math.round(heightWykresu - (najmniejszy - najmniejszy) * wspolczynnikWysokosciPunktu) - 4);

    }
})();
