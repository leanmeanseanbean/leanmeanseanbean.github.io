//gets all input boxes in the table
storeData = () => {
  const table = document.querySelectorAll("input");
  const payRate = parseFloat(table[0].value);
  let adoWeek;
  if (table[1].checked) {
    adoWeek = table[1].value;
  } else {
    adoWeek = table[2].value;
  }

  //array for all data in table
  let tableArray = [];
  //array for single row in table
  let rowArray = [];
  for (let i = 3; i < table.length; i++) {
    //determine if end of row
    if (table[i].readOnly) {
      tableArray.push(rowArray);
      rowArray = [];
      continue;
    }
    //if sick value, skip for now
    if (table[i].value === "SICK") {
      continue;
    }
    //if checkbox, see if its checked or not
    if (table[i].getAttribute("type") === "checkbox") {
      rowArray.push(table[i].checked);
      continue;
    }
    //else store the value of the input into the array for that row.
    rowArray.push(table[i].value);
  }

  calculatePay(payRate, adoWeek, tableArray);
};

calculatePay = (payRate, adoWeek, tableArray) => {
  const WOBOD = 0.48;
  const securityAllowance = 5.75;
  const cabEtrAllowance = 7.4;
  const nightShiftPenalty = 4.89;
  const EarlyMorningShiftPenalty = 4.15;
  const AfternoonShiftPenalty = 0;
  const weekdayOT = 1.5;
  const weekendOT = 2;
  const satLoading = 0.5;
  const sunLoading = 1;
  const adoAdjustment = payRate * 4;
  const specialLoading = 4.89;
  const shortWeekHours = 72;
  const longWeekHours = 80;
  const shiftLength = 8;
  var timeLost = 0;
  var baseHours = 76;
  const payArray = [];
  var dailyPayArray = [];
  var shortFall;
  var dailyHours = 0;
  var dailyMinutes = 0;
  var BU = 0;
  var LU = 0;
  var LB = 0;
  const weekdays = [
    `Sunday`,
    `Monday`,
    `Tuesday`,
    `Wednesday`,
    `Thursday`,
    `Friday`,
    `Saturday`,
    `Sunday`,
    `Monday`,
    `Tuesday`,
    `Wednesday`,
    `Thursday`,
    `Friday`,
    `Saturday`,
  ];
  var GrossPay = 0;
  var daysWorkedCounter = 0;
  var ordinaryHours = 0;
  var ordinaryMinutes = 0;
  var ordinaryUnits = 0;
  var dailyUnits = 0;
  var ordinaryDays = 0;
  var shortWeekDays = 9;
  var longWeekDays = 10;
  let pay = 0;
  //displaying information to user
  var payDiv = document.getElementById("payDetails");
  //empty any existing text
  payDiv.innerText = "";
for (let i = 0; i < 14; i++) {
  document.getElementsByClassName("displayHours")[
    i
  ].value = ``;
}
  
  //calculate hours and minutes worked
  timeWorked = calculateTimeWorked(tableArray);
  timeAsUnits = calculateTimeWorkedAsUnits(tableArray);
  if (adoWeek === "long") {
    baseHours = longWeekHours;
    ordinaryDays = longWeekDays;
  } else {
    baseHours = shortWeekHours;
    ordinaryDays = shortWeekDays;
  }
  //format of timeWorked = Rostered hours, actual hours, lift up [IF ANY, else 0], layback [IF ANY, else 0], buildup [IF ANY, else 0]

  console.log(tableArray);
  console.log(ordinaryDays);
  console.log(timeWorked);

  //CALCULATING DAILY HOURS
  for (let i = 0; i < timeWorked.length - 1; i++) {
    if (timeWorked[i].length > 0) {
      //adding all the working time;
      payDiv.innerText += `\n${weekdays[i]}: \n`;
      dailyPayArray = [];
      daysWorkedCounter++;
      dailyHours += timeWorked[i][1][0];
      dailyMinutes += timeWorked[i][1][1];
      dailyUnits += AsUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]);
      if (daysWorkedCounter <= ordinaryDays) {
        ordinaryHours += timeWorked[i][1][0];
        ordinaryMinutes += timeWorked[i][1][1];
      }

      //display time worked in the timesheet
      document.getElementsByClassName("displayHours")[
        i
      ].value = `${timeWorked[i][1][0]}:${timeWorked[i][1][1]}`;

      //add offset times for ordinary hours
      //buildup
      if (timeWorked[i][4] !== "-") {
        //build up as units
        BU = AsUnits(timeWorked[i][4][0] * 60 + timeWorked[i][4][1]);
        dailyUnits += BU;
        dailyHours += timeWorked[i][4][0];
        dailyMinutes += timeWorked[i][4][1];
        if (daysWorkedCounter <= ordinaryDays) {
          ordinaryHours += timeWorked[i][4][0];
          ordinaryMinutes += timeWorked[i][4][1];
        }
      }
      //liftup
      if (timeWorked[i][2] !== "-") {
        //lift up as units
        LU = AsUnits(timeWorked[i][2][0] * 60 + timeWorked[i][2][1]);
        dailyUnits += LU;
        dailyHours += timeWorked[i][2][0];
        dailyMinutes += timeWorked[i][2][1];
        if (daysWorkedCounter <= ordinaryDays) {
          ordinaryHours += timeWorked[i][2][0];
          ordinaryMinutes += timeWorked[i][2][1];
        }
      }
      //layback
      if (timeWorked[i][3] !== "-") {
        //layback as units
        LB = AsUnits(timeWorked[i][3][0] * 60 + timeWorked[i][3][1]);
        dailyUnits += LB;
        dailyHours += timeWorked[i][3][0];
        dailyMinutes += timeWorked[i][3][1];
        if (daysWorkedCounter <= ordinaryDays) {
          ordinaryHours += timeWorked[i][3][0];
          ordinaryMinutes += timeWorked[i][3][1];
        }
      }

      //change excess minutes into hours
      dailyMinutes = CheckDailyMinutes(dailyMinutes);
      ordinaryMinutes = CheckOrdinaryMinutes(ordinaryMinutes);
      ordinaryUnits += dailyUnits;

      if(timeAsUnits[i][1] + dailyUnits > 24){
        console.log(weekdays[i] + ` shift has passed midnight to finish on ` + weekdays[i+1]);
      }

      //excess shifts: overtime 150 on weekdays and 200 on weekends
      if (daysWorkedCounter > ordinaryDays) {
        //if its 1st or 2nd excess shift mon-fri, or a public holiday that isnt a saturday its 150%
        if (daysWorkedCounter <= ordinaryDays + 2) {
          if (weekdays[i] !== "Saturday") {
            dailyPayArray.push(
              rounded(
                AsUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                  payRate *
                  weekdayOT
              )
            );
            payDiv.innerText += ` Overtime @ 150%:  ${AsUnits(
              timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
            )}: ${rounded(
              AsUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                payRate *
                weekdayOT
            )}   \n`;
          }
          if (weekdays[i] === "Saturday") {
            dailyPayArray.push(
              rounded(
                AsUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                  payRate *
                  weekendOT
              )
            );
            payDiv.innerText += ` Overtime @ 200%:  ${AsUnits(
              timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
            )}: ${rounded(
              AsUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                payRate *
                weekendOT
            )}   \n`;
          }
          // public holiday loading
          if (tableArray[i][7] && weekdays[i] !== "Saturday") {
            // weekday PH is 50%
            dailyPayArray.push(
              rounded(timeWorked[i][1][0] * payRate * satLoading)
            );
            payDiv.innerText += ` PH Loading @ 50%:  ${
              timeWorked[i][1][0]
            }: ${rounded(timeWorked[i][1][0] * payRate * satLoading)}   \n`;
            // add minutes rounded up or down
          }
        }
        //if its 3rd excess day or more, or weekend, its 200%
        if (daysWorkedCounter > ordinaryDays + 2) {
          dailyPayArray.push(
            rounded(
              AsUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                payRate *
                weekendOT
            )
          );
          payDiv.innerText += ` Overtime @ 200%:  ${AsUnits(
            timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
          )}: ${rounded(
            AsUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
              payRate *
              weekendOT
          )}   \n`;
        }
      }
      //calculating first 9/10 days ordinary hours
      if (daysWorkedCounter <= ordinaryDays) {
        //if shifts are over 8 hours
        if (dailyUnits > shiftLength) {
          //add 8 hours to normal pay
          dailyPayArray.push(rounded(shiftLength * payRate));
          //print the details
          payDiv.innerText += ` Ordinary Hours:  ${shiftLength}: ${rounded(
            shiftLength * payRate
          )}   \n`;
          //anything worked over 8 is scheduled OT, weekend or PH is 200%

          if (
            weekdays[i] === "Saturday" ||
            weekdays[i] === "Sunday" ||
            tableArray[i][7]
          ) {
            dailyPayArray.push(
              rounded(
                AsUnits(
                  ((dailyHours - shiftLength) * 60 + dailyMinutes) *
                    payRate *
                    weekendOT
                )
              )
            );
            //CALCULATE ORDINARY TIME
            //@200% its equal in 1:1 ratio
            if (daysWorkedCounter <= ordinaryDays) {
              ordinaryMinutes += (dailyHours - shiftLength) * 60 + dailyMinutes;
              ordinaryMinutes = CheckOrdinaryMinutes(ordinaryMinutes);

              ordinaryUnits += AsUnits(
                (dailyHours - shiftLength) * 60 + dailyMinutes
              );
            }

            //print the details
            payDiv.innerText += ` Sched OT 200%:  ${AsUnits(
              (dailyHours - shiftLength) * 60 + dailyMinutes
            )}: ${rounded(
              AsUnits(
                ((dailyHours - shiftLength) * 60 + dailyMinutes) *
                  payRate *
                  weekendOT
              )
            )}   \n`;
          } //otherwise scheduled OT is 150%;
          else {
            dailyPayArray.push(
              rounded(
                AsUnits((dailyHours - shiftLength) * 60 + dailyMinutes) *
                  payRate *
                  weekdayOT
              )
            );
            //CALCULATE ORDINARY TIME
            //@150% its half the OT time
            if (daysWorkedCounter <= ordinaryDays) {
              ordinaryMinutes +=
                ((dailyHours - shiftLength) * 60 + dailyMinutes) / 2;
              ordinaryMinutes = CheckOrdinaryMinutes(ordinaryMinutes);

              ordinaryUnits +=
                AsUnits((dailyHours - shiftLength) * 60 + dailyMinutes) / 2;
            }

            //print the details
            payDiv.innerText += ` Sched OT 150%:  ${AsUnits(
              (dailyHours - shiftLength) * 60 + dailyMinutes
            )}: ${rounded(
              AsUnits((dailyHours - shiftLength) * 60 + dailyMinutes) *
                payRate *
                weekdayOT
            )}   \n`;
          }
        } // if shift is 8 hours or under calculate normal pay
        if (dailyUnits <= shiftLength) {
          dailyPayArray.push(
            rounded(AsUnits(dailyHours * 60 + dailyMinutes) * payRate)
          );
          //print the details
          payDiv.innerText += ` Ordinary Hours:  ${AsUnits(
            dailyHours * 60 + dailyMinutes
          )}: ${rounded(
            AsUnits(dailyHours * 60 + dailyMinutes) * payRate
          )}   \n`;
        }

        //LOADINGS BASED ON WORKING HOURS.
        //NEED TO REFACTOR TO ROUND UP OR DOWN THE MINUTES FOR AN EXTRA UNIT OF PAY
        // saturday loading
        if (weekdays[i] === "Saturday" && !tableArray[i][7]) {
          dailyPayArray.push(
            rounded(
              RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                payRate *
                satLoading
            )
          );
          payDiv.innerText += ` Loading @ 50% Saturday:  ${RoundedUnits(
            timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
          )}: ${rounded(
            RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
              payRate *
              satLoading
          )}   \n`;
          // add minutes rounded up or down
        }
        // sunday loading
        if (weekdays[i] === "Sunday" && !tableArray[i][7]) {
          dailyPayArray.push(
            rounded(
              RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                payRate *
                sunLoading
            )
          );
          payDiv.innerText += ` Loading @ 100% Sunday:  ${RoundedUnits(
            timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
          )}: ${rounded(
            RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
              payRate *
              sunLoading
          )}   \n`;
          // add minutes rounded up or down
        }
        // public holiday loading
        if (tableArray[i][7]) {
          // weekend PH is 100%
          if (weekdays[i] === "Sunday" || weekdays[i] === "Saturday") {
            dailyPayArray.push(
              rounded(
                RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                  payRate *
                  sunLoading
              )
            );
            payDiv.innerText += ` PH Loading @ 100%:  ${RoundedUnits(
              timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
            )}: ${rounded(
              RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                payRate *
                sunLoading
            )}   \n`;
            // add minutes rounded up or down
          } else {
            // weekday PH is 50%
            dailyPayArray.push(
              rounded(
                RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                  payRate *
                  satLoading
              )
            );
            payDiv.innerText += ` PH Loading @ 50%:  ${RoundedUnits(
              timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
            )}: ${rounded(
              RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                payRate *
                satLoading
            )}   \n`;
            // add minutes rounded up or down
          }
        }
        //SHIFT ALLOWANCE PENALTIES - ONLY ON WEEKDAYS
        if (
          weekdays[i] !== "Sunday" &&
          weekdays[i] !== "Saturday" &&
          !tableArray[i][7]
        ) {
          if (tableArray[i][1] >= 400 && tableArray[i][1] <= 530) {
            console.log("its morning shift!");
            dailyPayArray.push(
              rounded(
                RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                  EarlyMorningShiftPenalty
              )
            );
            payDiv.innerText += ` Morning Shift Dvrs/Grds Hrl:  ${RoundedUnits(
              timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
            )}: ${rounded(
              RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                EarlyMorningShiftPenalty
            )}   \n`;
          }
          if (tableArray[i][1] < 1800 && tableArray[i][3] > 1800) {
            console.log("its arvo shift!");
            dailyPayArray.push(
              rounded(
                RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                  AfternoonShiftPenalty
              )
            );
            payDiv.innerText += ` Afternoon Shift Dvrs/Grds Hrl:  ${RoundedUnits(
              timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
            )}: ${rounded(
              RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                AfternoonShiftPenalty
            )}   \n`;
          }
          if (tableArray[i][1] <= 359 || tableArray[i][1] >= 1800) {
            dailyPayArray.push(
              rounded(
                RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                  nightShiftPenalty
              )
            );
            payDiv.innerText += ` Night Shift Dvrs/Grds Hrl:  ${RoundedUnits(
              timeWorked[i][1][0] * 60 + timeWorked[i][1][1]
            )}: ${rounded(
              RoundedUnits(timeWorked[i][1][0] * 60 + timeWorked[i][1][1]) *
                nightShiftPenalty
            )}   \n`;
          }
          //SPECIAL SHIFT LOADING ONE UNIT PER SHIFT
          if (
            (tableArray[i][1] >= 101 && tableArray[i][1] <= 359) ||
            (tableArray[i][3] >= 101 && tableArray[i][3] <= 359)
            //WHAT IF THE SHIFT STARTS ON A NON PH AND FINISHES ON A PH IN THE SPECIAL LOADING PERIOD?
          ) {
            dailyPayArray.push(specialLoading);
            payDiv.innerText += ` Special Loading Drvs/Grds:  1: ${specialLoading}   \n`;
          }
        }
      }

      //add security if ticked - single unit per shift
      if (tableArray[i][4]) {
        dailyPayArray.push(securityAllowance);
        payDiv.innerText += ` Guards Security Allow:  1: ${securityAllowance}   \n`;
      }
      //add cab if ticked - single unit per shift
      if (tableArray[i][5]) {
        dailyPayArray.push(cabEtrAllowance);
        payDiv.innerText += ` Elec Guards Spl Shift All:  1: ${cabEtrAllowance}   \n`;
      }
      //add public holiday paid if ticked and accrue is not ticked
      //CHECK IF THIS IS 8 HOURS REGARDLESS OR ACTUAL WORKING HOURS
      if (tableArray[i][7] && !tableArray[i][8]) {
        dailyPayArray.push(rounded(shiftLength * payRate));
        payDiv.innerText += ` Public Holiday Paid:  ${shiftLength}: ${rounded(
          shiftLength * payRate
        )}   \n`;
      }
      // accrue public holiday, doesnt get paid.
      if (tableArray[i][7] && tableArray[i][8]) {
        console.log(
          "public holiday accrued up to 8 a year + 1 non proclaimed PH aka picnic day"
        );
        payDiv.innerText += ` Public Holiday Accrued  \n`;
      }

      //print working time and running total
      console.log(
        daysWorkedCounter +
          `: ` +
          dailyHours +
          ` ` +
          dailyMinutes +
          ` - as Units: ` +
          dailyUnits +
          `||` +
          ordinaryHours +
          ` ` +
          ordinaryMinutes +
          ` - as Units: ` +
          ordinaryUnits
      );

      //reset daily counters
      dailyHours = 0;
      dailyMinutes = 0;
      dailyUnits = 0;

      payArray.push(dailyPayArray);
      dailyPayArray = [];
    } else {
      console.log("day off");
      payDiv.innerText += `\n${weekdays[i]}:  DAY OFF\n`;
      dailyPayArray = [];
      payArray.push(dailyPayArray);
      dailyPayArray = [];
    }
  }

  // ADJUSTING FOR ADO
  // DOES IT MATTER WHERE THE ADO IS IN THE FORTNIGHT??
  if (adoWeek === "long") {
    payArray.push(rounded(adoAdjustment * -1));
    payDiv.innerText += ` \nAccrued Day Off - Adjustm:  4: ${rounded(
      adoAdjustment * -1
    )}   \n`;
  } else {
    payArray.push(rounded(adoAdjustment));
    payDiv.innerText += ` \nAccrued Day Off - Adjustm:  4: ${rounded(
      adoAdjustment
    )}   \n`;
  }

  //guarantee payment
  if (daysWorkedCounter >= ordinaryDays) {
    //convert ordinary hours and ordinary minutes into units
    console.log(
      `ordinary hours at the end of ` +
        ordinaryDays +
        `days: ` +
        AsUnits(ordinaryHours * 60 + ordinaryMinutes)
    );
    console.log(`base hours for a ` + adoWeek + ` are ` + baseHours);
    if (AsUnits(ordinaryHours * 60 + ordinaryMinutes) >= baseHours) {
      console.log(`there is no guarantee payment.`);
    }
    if (AsUnits(ordinaryHours * 60 + ordinaryMinutes) < baseHours) {
      console.log(
        `there is a guarantee payment for ` +
          (baseHours - AsUnits(ordinaryHours * 60 + ordinaryMinutes)) +
          ` units which is ` +
          Math.trunc(
            baseHours - AsUnits(ordinaryHours * 60 + ordinaryMinutes)
          ) +
          `'` +
          (60 - ordinaryMinutes) +
          `"`
      );
    }
    //base hours - ordinary hours and minutes
    // shortfall????
  }

  console.log(payArray);

  for (let i = 0; i < payArray.length; i++) {
    for (let j = 0; j < payArray[i].length; j++) {
      GrossPay += payArray[i][j];
    }
    if (i === 14) {
      GrossPay += payArray[i];
    }
  }

  console.log(GrossPay);
  payDiv.innerText += ` \n Gross Pay:  ${rounded(GrossPay)}   \n`;

  function CheckDailyMinutes(dailyMinutes) {
    if (dailyMinutes >= 60) {
      dailyHours += (dailyMinutes - (dailyMinutes % 60)) / 60;
      let temp = dailyMinutes % 60;
      dailyMinutes = temp;
    }
    return dailyMinutes;
  }

  function CheckOrdinaryMinutes(ordinaryMinutes) {
    if (ordinaryMinutes >= 60) {
      ordinaryHours += (ordinaryMinutes - (ordinaryMinutes % 60)) / 60;
      let temp = ordinaryMinutes % 60;
      ordinaryMinutes = temp;
    }
    return ordinaryMinutes;
  }
};

function rounded(pay) {
  return Math.round((pay + Number.EPSILON) * 100) / 100;
}

function AsUnits(minutes) {
  return Math.round((minutes / 60 + Number.EPSILON) * 100) / 100;
}

function UnitsAsMinutes(units) {
  return Math.round(units * 60);
}

function RoundedUnits(minutes) {
  return Math.round(minutes / 60);
}

calculateTimeWorked = (tableArray) => {
  const timeWorked = [];
  //format of timeWorked = Rostered hours, actual hours, lift up [IF ANY, else 0], layback [IF ANY, else 0], buildup [IF ANY, else 0]
  var rowTime = [];
  var totalTime = 0;

  tableArray.forEach((row) => {
    //if day is empty, push an empty array
    if (row[0] === "") {
      timeWorked.push(rowTime);
    } else {
      const x = [];
      //changes time into hours and minutes
      let finishTimeRostered = row[2].match(/.{2}/g);
      //format of array [HH,MM]
      //calculate the total rostered MINUTES worked
      let finishTimeRosteredInMinutes =
        parseInt(finishTimeRostered[0]) * 60 + parseInt(finishTimeRostered[1]);

      let startTimeRostered = row[0].match(/.{2}/g);
      let startTimeRosteredInMinutes =
        parseInt(startTimeRostered[0]) * 60 + parseInt(startTimeRostered[1]);

      //calculate the total actual MINUTES worked
      let finishTime = row[3].match(/.{2}/g);
      let finishTimeInMinutes =
        parseInt(finishTime[0]) * 60 + parseInt(finishTime[1]);

      let startTime = row[1].match(/.{2}/g);
      let startTimeInMinutes =
        parseInt(startTime[0]) * 60 + parseInt(startTime[1]);

      //rostered minutes convert to hours and percentage of hours
      let diffRostered =
        (finishTimeRosteredInMinutes - startTimeRosteredInMinutes) / 60;
      let diffTimeRostered = diffRostered.toFixed(2).toString().split(".");
      //changes percentages back to normal minutes or per units just like the payslip.
      let diffTimeRosteredResult = [
        parseInt(diffTimeRostered[0]),
        Math.round((60 * parseFloat(diffTimeRostered[1])) / 100),
      ];
      x.push(diffTimeRosteredResult);

      //change minutes back to hours and percentages of ACTUAL work.
      let diff = (finishTimeInMinutes - startTimeInMinutes) / 60;
      totalTime += finishTimeInMinutes - startTimeInMinutes;
      let diffTime = diff.toFixed(2).toString().split(".");
      //changes percentages back to normal minutes or per units just like the payslip.
      let diffTimeResult = [
        parseInt(diffTime[0]),
        Math.round((60 * parseFloat(diffTime[1])) / 100),
      ];
      x.push(diffTimeResult);

      //LIFT UP
      //if actual start time < rostered start time && actual finish < rostered finish, lift up is calculated on the finishing difference
      if (row[0] > row[1] && row[2] > row[3]) {
        let liftUpInMinutes =
          (finishTimeRosteredInMinutes - finishTimeInMinutes) / 60;
        let liftUpConversion = liftUpInMinutes.toFixed(2).toString().split(".");
        let liftUpResult = [
          parseInt(liftUpConversion[0]),
          Math.round((60 * parseFloat(liftUpConversion[1])) / 100),
        ];
        x.push(liftUpResult);
      } else {
        x.push("-");
      }

      //LAY BACK
      //if actual starting time > rostered starting time && shift length is same or more
      if (row[0] < row[1] && row[3] >= row[2] + (row[1] - row[0])) {
        let layBackInMinutes =
          (startTimeInMinutes - startTimeRosteredInMinutes) / 60;
        let layBackConversion = layBackInMinutes
          .toFixed(2)
          .toString()
          .split(".");
        let layBackResult = [
          parseInt(layBackConversion[0]),
          Math.round((60 * parseFloat(layBackConversion[1])) / 100),
        ];
        x.push(layBackResult);
      } else {
        x.push("-");
      }

      //BUILD UP
      //if hours worked is different && actual start is later than rostered start && actual finish is earlier than rostered finish
      //there is no buildup with lift up
      if (diff !== diffRostered && row[1] >= row[0] && row[3] <= row[2]) {
        let buildUp = diff - diffRostered;
        let buildUpTime = buildUp.toFixed(2).toString().split(".");
        let buildUpResult = [
          Math.abs(parseInt(buildUpTime[0])),
          Math.round((60 * parseFloat(buildUpTime[1])) / 100),
        ];
        x.push(buildUpResult);
      } else {
        x.push("-");
      }

      timeWorked.push(x);
    }
  });

  //get the total.
  let total = totalTime / 60;
  let totalTimeConversion = total.toFixed(2).toString().split(".");
  let totalTimeResult = [
    parseInt(totalTimeConversion[0]),
    Math.round((60 * parseFloat(totalTimeConversion[1])) / 100),
  ];
  timeWorked.push(totalTimeResult);

  // console.log(timeWorked);
  return timeWorked;
};

calculateTimeWorkedAsUnits = (tableArray) => {
  const timeAsUnits = [];
  //format of timeWorked = Rostered hours, actual hours, lift up [IF ANY, else 0], layback [IF ANY, else 0], buildup [IF ANY, else 0]
  var rowTime = [];
  const weekdays = [
    `Sunday`,
    `Monday`,
    `Tuesday`,
    `Wednesday`,
    `Thursday`,
    `Friday`,
    `Saturday`,
    `Sunday`,
    `Monday`,
    `Tuesday`,
    `Wednesday`,
    `Thursday`,
    `Friday`,
    `Saturday`,
  ];

  tableArray.forEach((row, index) => {
    //if day is empty, push an empty array
    if (row[0] === "") {
      timeAsUnits.push(rowTime);
    } else {
      const x = [];

      //start time rostered as units
      let startTimeRostered = row[0].match(/.{2}/g);
      let startTimeRosteredInMinutes =
        parseInt(startTimeRostered[0]) * 60 + parseInt(startTimeRostered[1]);
        let startTimeRosteredInUnits = rounded(startTimeRosteredInMinutes/60);
        x.push(startTimeRosteredInUnits);

        //start time actual as units
      let startTime = row[1].match(/.{2}/g);
      let startTimeInMinutes =
        parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
        let startTimeInUnits = rounded(startTimeInMinutes/60);
        x.push(startTimeInUnits);

        // finish time rostered as units
      let finishTimeRostered = row[2].match(/.{2}/g);
      let finishTimeRosteredInMinutes =
        parseInt(finishTimeRostered[0]) * 60 + parseInt(finishTimeRostered[1]);
        let finishTimeRosteredInUnits = rounded(finishTimeRosteredInMinutes/60)
        x.push(finishTimeRosteredInUnits);

      //finish time actual as units
      let finishTime = row[3].match(/.{2}/g);
      let finishTimeInMinutes =
        parseInt(finishTime[0]) * 60 + parseInt(finishTime[1]);
        let finishTimeInUnits = rounded(finishTimeInMinutes/60);
        x.push(finishTimeInUnits);

        //actual time worked as units
        x.push(finishTimeInUnits - startTimeInUnits);

        //LU
        if(startTimeInUnits < startTimeRosteredInUnits){
          x.push(finishTimeRosteredInUnits - finishTimeInUnits);
        }
        else{
          x.push(`no lift up`);
        }
        //LB
        if(startTimeInUnits > startTimeRosteredInUnits && finishTimeInUnits >= finishTimeRosteredInUnits + (startTimeInUnits - startTimeRosteredInUnits)){
          x.push(startTimeInUnits - startTimeRosteredInUnits)
        }else{
          x.push(`no layback`);
        }
        //BU
        let bu = (startTimeInUnits - startTimeRosteredInUnits) + (finishTimeRosteredInUnits - finishTimeInUnits);
        if(startTimeInUnits >= startTimeRosteredInUnits && finishTimeInUnits < finishTimeRosteredInUnits || startTimeInUnits > startTimeRosteredInUnits && finishTimeInUnits <= finishTimeRosteredInUnits){
          x.push(bu);
        }
        else{
          x.push(`no buildup`);
        }
      
        // start day
      x.push(weekdays[index]);

      // finish day
      if(startTimeRosteredInUnits > finishTimeRosteredInUnits){
        x.push(weekdays[index+1]);
      }
      else{
        x.push(weekdays[index]);
      }

      // DO WE CALCULATE HOW MANY HOURS IS IN ONE DAY AND HOW MANY HOURS ARE IN THE NEXT DAY?

      timeAsUnits.push(x);
    }
  });

  console.log(timeAsUnits);
  return timeAsUnits;
};
