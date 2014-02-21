/*jslint indent: 2, nomen: true, maxlen: 100, vars: true, white: true, plusplus: true */
/*global require, exports, Backbone, EJS, $, flush, window, arangoHelper, nv, d3, localStorage*/
/*global templateEngine */

(function() {
  "use strict";

  window.dashboardView = Backbone.View.extend({
    el: '#content',
    interval: 100000,
    defaultHistoryElements: 3, //in days
    chartTypeExceptions : {
        accumulated : {
            minorPageFaults : "lineChartDiffBased",
            majorPageFaults : "lineChartDiffBased",
            requestsTotal : "lineChartDiffBased",
            requestsAsync: "lineChartDiffBased",
            requestsGet: "lineChartDiffBased",
            requestsHead: "lineChartDiffBased",
            requestsPost: "lineChartDiffBased",
            requestsPut: "lineChartDiffBased",
            requestsPatch: "lineChartDiffBased",
            requestsDelete: "lineChartDiffBased",
            requestsOptions: "lineChartDiffBased",
            requestsOther: "lineChartDiffBased"

        },

        distribution : {
            totalTime : "http_requestsTotal",
            requestTime: "http_requestsTotal",
            queueTime: "http_requestsTotal",
            bytesSent: "http_requestsTotal",
            bytesReceived: "http_requestsTotal"
        }
    },


    initialize: function () {
      this.arangoReplication = new window.ArangoReplication();
      this.documentStore = this.options.documentStore;
      this.getStatisticHistory();
      this.description = this.options.description.models[0];
      this.startUpdating();








    },

    prepareSeries: function () {
        var self = this;
        self.series = {};
        self.description.get("groups").forEach(function(group) {
            self.series[group.group] = {};
        });
        self.description.get("figures").forEach(function(figure) {
            self.series[figure.group][figure.identifier] = {};
            if (self.chartTypeExceptions[figure.type] &&
                self.chartTypeExceptions[figure.type][figure.identifier]) {
                self.series[figure.group][figure.identifier][
                    self.chartTypeExceptions[figure.type][figure.identifier]
                    ] = [];
                if (figure.type === "distribution") {
                    self.series[figure.group][figure.identifier]["distribution"];
                }
            } else {
                 self.series[figure.group][figure.identifier][figure.type] = [];
            }




        });
    },


    calculateSeries: function () {
        var self = this;
        self.LastValues = {};
        self.history.forEach(function(entry) {
                var time = entry.time * 1000;
                //iteration über Gruppen
                self.description.get("groups").forEach(function(g) {
                    //iteration über figures
                    Object.keys(entry[g.group]).forEach(function(figure) {
                       //iteration über valuelisten:
                       var valueLists = self.series[g.group][figure];
                        Object.keys(valueLists).forEach(function (valueList) {
                            var val = entry[g.group][figure];
                            if (valueList === "lineChartDiffBased") {
                                if (!self.LastValues[figure]) {
                                    self.LastValues[figure] = val;
                                }
                                valueLists[valueList].push([new Date(time), val - self.LastValues[figure]]);
                                self.LastValues[figure] = val;
                            } else if (valueList === "distribution") {
                                valueLists[valueList] = val;
                            } else if (valueList === "accumulated") {
                                //delete valueLists[valueList];
                            } else if (valueList === "current") {
                                valueLists[valueList].push([new Date(time), val]);
                            } else  {
                                var calcGroup = valueList.split("_")[0];
                                var calcFigure = valueList.split("_")[1];
                                //valueLists["current"] = valueLists[valueList];
                                //delete valueLists[valueList];
                                valueLists[valueList].push([new Date(time), val / entry[calcGroup][calcFigure]]);
                            }
                        });

                    });
                });
                self.series["system"]["systemUserTime"] =
                    [new Date(time), entry["system"]["systemTime"], entry["system"]["userTime"]];

        });
        delete self.LastValues;
        console.log(self.series);
    },

    renderFigures: function () {

    },

    renderPieCharts: function () {

    },

    renderLineCharts: function () {

    },

    getStatisticHistory : function () {
        this.documentStore.getStatisticsHistory(
            (new Date().getTime() - this.defaultHistoryElements * 86400 * 1000) / 1000
        );

        this.history = this.documentStore.history;
        console.log(this.history);
    },

    startUpdating: function () {
        var self = this;
        if (this.isUpdating) {
            return;
        }
        this.isUpdating = true;
        var self = this;
        this.timer = window.setInterval(function() {
                self.collection.fetch({
                success: function() {
                    self.history.push({
                        time : new Date().getTime() / 1000,

                        client: self.collection.first().get("client"),
                        http: self.collection.first().get("http"),
                        server: self.collection.first().get("server"),
                        system: self.collection.first().get("system")

                    });
                    self.prepareSeries();
                    self.calculateSeries();
                    self.renderFigures();
                    self.renderPieCharts();
                    self.renderLineCharts();
                },
                 error: function() {

                  }
                });
            },
            self.interval
        );
    },

    template: templateEngine.createTemplate("dashboardView.ejs"),

    render: function() {
      var self = this;
      $(this.el).html(this.template.render({}));
      this.prepareSeries();
      this.calculateSeries();
      this.renderFigures();
      this.renderPieCharts();
      this.renderLineCharts();


    }


   });
}()
  );
