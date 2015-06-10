// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";
    var listaWalutaHelper = [];//Tablica pomocnicza do przechowywania zmiennych 
    var records = [];//lista rekordów do rysowania
    var SYMBOL_WALUTY;
    var listaDoPobrania = [];//lista dla dat kursów które nie były pobrane jeszcze

    WinJS.UI.Pages.define("/pages/chartView/ChartView.html", {
        ready: function (element, options) {

            //Ustawienie tytulu strony z kodem waluty
            SYMBOL_WALUTY = options.symbol.toString();
            document.getElementById("pageTitle").innerHTML = "Historia waluty " + options.symbol.toString().toUpperCase();
            //Zaladowanie dat do pamieci
            this.loadFileList();
            //Dodanie handlerow do poszczegolwnych przyciskow
            document.getElementById("rysuj").addEventListener('click', this.pobierzPunkty, false);//handler przycisku rysuj
            document.getElementById("zapisz").addEventListener('click', this.zapisz, false);//handler przycisku zapisz
            document.getElementById("dataPoczatkowa").addEventListener('change', this.sprawdzDate, false);//handler daty poczatkowej
            document.getElementById("dataKoncowa").addEventListener('change', this.sprawdzDate, false);//handler daty koncowej
            document.getElementById("exitAppChart").addEventListener('click', function a() { window.close(); }, false);//handler przycisku zamkniecia aplikacji
            document.getElementById("zapisz").disabled = true; //Chwilowe wylaczenie przycisku od zapisu
        },
        //Funckja sprawdzajaca czy data poczatkowa nie jest starsza od koncowej
        sprawdzDate: function () {
            var dPoczatkowa;
            var dKoncowa;
            dPoczatkowa = document.getElementById("dataPoczatkowa").winControl;
            dKoncowa = document.getElementById("dataKoncowa").winControl;
            if (dKoncowa.current > dPoczatkowa.current) {
                document.getElementById("errorLine").innerHTML = "Poprawna data";
            } else {
                document.getElementById("errorLine").innerHTML = "Data koncowa musi byc pozniejsza od koncowej";
                document.getElementById("rysuj").disabled = true; // Jezeli nie jest poprawne to blokujemy przycisk
            }

        },
        //Funkcja zapisujaca canvas do pliku
        zapisz: function(){
            var picker = new Windows.Storage.Pickers.FileSavePicker();
            var decoder;
            picker.suggestedStartLocation =
            Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
            picker.suggestedFileName = "Wykres";
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
                return Windows.Graphics.Imaging.BitmapEncoder.createAsync(
                Windows.Graphics.Imaging.BitmapEncoder.pngEncoderId, stream);
            }).then(function (encoder) {
                //Set the pixel data--assume "encoding" object has options from elsewhere.
                //Conversion from canvas data to Uint8Array is necessary because the array type
                //from the canvas doesn't match what WinRT needs here.
                var canvas = document.getElementById("myCanvas");
                encoder.setPixelData(Windows.Graphics.Imaging.BitmapPixelFormat.bgra8, Windows.Graphics.Imaging.BitmapAlphaMode.straight,
                   canvas.width,canvas.height,96,96,
                new Uint8Array(imgData.data));
                //Go do the encoding
                return encoder.flushAsync();
            }).done(function () {
                fileStream.close();
            }, function () {
                //Empty error handler (do nothing if the user canceled the picker)
            });
        },
        //Funkcja pobierajca potrzebne punkty do narysowania wykresu
        pobierzPunkty: function () {
            var dPoczatkowa;
            var dKoncowa;
            dPoczatkowa = document.getElementById("dataPoczatkowa").winControl;
            dKoncowa = document.getElementById("dataKoncowa").winControl;
            //Czyscimy wykres przed rysowaniem
            var canvas = document.getElementById("myCanvas");
            var context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);
            //Info dla uzytkowania ze wykres jest w trakcie rysowania
            document.getElementById("errorLine").innerHTML = "Oczekiwanie na wykres.";
            //Czysczenie bufora dla wykresu
            listaDoPobrania = [];
            records = [];
            //Flaga pokazujaca ze punkty naleza do przedzialu wybranego przez uzytkownika
            var flagHistory = false;
            //Tworzenie obiektow daty ograniczajacych obszar wybrany przez uzytkownika
            var dayPoczatkowa = dPoczatkowa.current.getDate();
            var monthPoczatkowa = dPoczatkowa.current.getMonth() + 1;
            var yearPoczatkowa = dPoczatkowa.current.getFullYear();

            var dayKoncowa = dKoncowa.current.getDate();
            var monthKoncowa = dKoncowa.current.getMonth() + 1;
            var yearKoncowa = dKoncowa.current.getFullYear();

            var stringPoczatkowa;
            var stringKoncowa;

            //Konwersja daty do stringa
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

            //Konwersja daty do stringa
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

            //Petla sprawdzajaca czy punkt nalezy do przedzialu histori wybranego przez uzytkownika
            //jesli tak to dodaje odpowiedni obiekt do bufora
            for (var i = 0; i < listaWalutaHelper.length; i++) {
                var dTmp = new Date(listaWalutaHelper[i].data.toString());
                if (dTmp >= dTmpPoczatkowa ) {
                    flagHistory = true;
                }
                //Flaga ustawiona
                if (flagHistory) {
                    //Sprawdzanie czy punkt nie zostal jeszcze pobrany
                    if (listaWalutaHelper[i].wartosc == null) {
                        listaDoPobrania.push(i);
                    }
                }
                //Flaga zmienia sie jesli wykryty jest koniec przedzialu wybranego przez uzytkownika
                if (dTmp >= dTmpKoncowa) {
                    flagHistory = false;
                    break;
                }
            }

            //Buffor z funkcjami potrzebnymi do pobrania wszytskich plikow xml z kursami
            var promises = {};
            for (var i = 0; i < listaDoPobrania.length; i++) {
                promises["fl" + listaDoPobrania[i]] = WinJS.xhr({ url: "http://www.nbp.pl/kursy/xml/" + listaWalutaHelper[listaDoPobrania[i]].url + ".xml" });
            }

            //Czekanie az zostana pobrane wszytskie pliki potrzbene do narysowania
            WinJS.Promise.join(promises).done(
                //Po pobierniau
                function complete(xhr) {
                    //Wpisywanie pobranych wartosci
                    for (var j = 0; j < listaDoPobrania.length; j++) {
                        var cResult = xhr["fl" + listaDoPobrania[j]].responseXML;
                        var items = cResult.querySelectorAll('tabela_kursow');
                        items = cResult.querySelectorAll('tabela_kursow > pozycja');
                        for (var i = 0; i < items.length; i++) {
                            if (items[i].querySelector("kod_waluty").textContent == SYMBOL_WALUTY)
                                listaWalutaHelper[listaDoPobrania[j]].wartosc = items[i].querySelector("kurs_sredni").textContent.replace(",", ".");
                        }
                    }

                    //Petla dodajaca potrzebne punkty do bufora rysowania
                    var flagHistory = false;
                    for (var i = 0; i < listaWalutaHelper.length; i++) {
                        var dTmp = new Date(listaWalutaHelper[i].data.toString());
                        if (dTmp >= dTmpPoczatkowa) {
                            flagHistory = true;
                        }
                        if (flagHistory) {
                            if (listaWalutaHelper[i].wartosc != null) {
                                records.push(listaWalutaHelper[i].wartosc);
                            }
                        }
                        if (dTmp >= dTmpKoncowa) {
                            flagHistory = false;
                            break;
                        }
                    }
                    rysuj();
                    document.getElementById("errorLine").innerHTML = "Wykres załadowany.";
                }
        );


        },
        //Funkcja pobierajaca daty potrzebne do narysowania wykresu
        loadFileList: function () {

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
                    document.getElementById("ErrorLine").innerHTML = "Eror: " + error.statusText;
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
    //Funkcja rysujaca wykres 
    function rysuj() {

        var canvas = document.getElementById("myCanvas");
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        var margin = 40;
        var width = canvas.width;
        var height = canvas.height;

        var leftMargin = margin;
        var bottomMargin = height - margin;
        var topMargin = margin;
        var rightMargin = width - margin;
        var sep = 10;

        //Rysowanie osi wykresu
        context.beginPath();
        context.lineWidth = 2;
        context.strokeStyle = '#0000FF';
        context.moveTo(leftMargin, topMargin);
        context.lineTo(leftMargin, bottomMargin);
        context.stroke();
        context.moveTo(leftMargin, bottomMargin);
        context.lineTo(rightMargin, bottomMargin);
        context.stroke();

        //Rysowanie strzalek
        context.moveTo(leftMargin, topMargin);
        context.lineTo(leftMargin - 6, topMargin + 6);
        context.stroke();
        context.moveTo(leftMargin, topMargin);
        context.lineTo(leftMargin + 6, topMargin + 6);
        context.stroke();
        context.moveTo(rightMargin, bottomMargin);
        context.lineTo(rightMargin - 6, bottomMargin + 6);
        context.stroke();
        context.moveTo(rightMargin, bottomMargin);
        context.lineTo(rightMargin - 6, bottomMargin - 6);
        context.stroke();

        //Napis WARTOŚĆ przy osi Y
        context.strokeStyle = '#000F00';
        context.lineWidth = 1;
        context.font = "14px Calibri";
        context.strokeText("W", 20, 150);
        context.strokeText("A", 20, 165);
        context.strokeText("R", 20, 180);
        context.strokeText("T", 20, 195);
        context.strokeText("O", 20, 210);
        context.strokeText("Ś", 20, 225);
        context.strokeText("Ć", 20, 240);

        //Napis przy osi X
        context.font = "14px Calibri";
        context.strokeText("Czas publikacji kursu", 200, height - 20);


        context.closePath();
        context.beginPath();
        context.strokeStyle = '#FF0000';
        context.lineWidth = 1;
        var heightWykresu = height - margin - sep;
        var widthWykresu = width - 2 * margin;

        //Wyciagniecie najmniejszej wartosci oraz najwiekszej
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

        //Obliczenie wspolczynnikow
        var wspolczynnikSzerokosciPunktu = widthWykresu / (records.length - 1);
        var wspolczynnikWysokosciPunktu = (heightWykresu - margin - sep * 4) / (najwiekszy - najmniejszy);

        //Punkt od ktorego startujemy
        var lastx = margin;
        var lasty = heightWykresu - (records[0] - najmniejszy) * wspolczynnikWysokosciPunktu;

        //Rysowanie kojenego 
        for (var i = 1; i < records.length; i++) {
            context.moveTo(Math.round(lastx), Math.round(lasty));
            lastx = i * wspolczynnikSzerokosciPunktu + 40;
            lasty = heightWykresu - (records[i] - najmniejszy) * wspolczynnikWysokosciPunktu;
            context.lineTo(Math.round(lastx), Math.round(lasty));
            context.stroke();
        }
        context.closePath();
        context.beginPath();
        context.strokeStyle = '#00FFFF';

        //Linia zaznaczajaca najwieksza wartosc
        context.moveTo(Math.round(leftMargin), Math.round(heightWykresu - (najwiekszy - najmniejszy) * wspolczynnikWysokosciPunktu));
        context.lineTo(Math.round(rightMargin), Math.round(heightWykresu - (najwiekszy - najmniejszy) * wspolczynnikWysokosciPunktu));
        context.stroke();

        //Linia zaznaczajaca najnizsza wartosc
        context.moveTo(Math.round(leftMargin), Math.round(heightWykresu - (najmniejszy - najmniejszy) * wspolczynnikWysokosciPunktu));
        context.lineTo(Math.round(rightMargin), Math.round(heightWykresu - (najmniejszy - najmniejszy) * wspolczynnikWysokosciPunktu));
        context.stroke();

        //Opis najwyzszej wartosci 
        context.strokeStyle = '#0F0F0F';
        context.lineWidth = 1;
        context.font = "12px Calibri";
        context.strokeText(najwiekszy, Math.round(leftMargin + widthWykresu / 2), Math.round(heightWykresu - (najwiekszy - najmniejszy) * wspolczynnikWysokosciPunktu) - 4);


        //Opis najnizszej wartosci 
        context.strokeStyle = '#0F0F0F';
        context.lineWidth = 1;
        context.font = "12px Calibri";
        context.strokeText(najmniejszy, Math.round(leftMargin + widthWykresu / 2), Math.round(heightWykresu - (najmniejszy - najmniejszy) * wspolczynnikWysokosciPunktu) - 4);

        document.getElementById("zapisz").disabled = false;
    }
})();
