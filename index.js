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
  const EarlyMorningShiftPenalty = 0;
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
  var grossHours = 0;
  var grossMinutes = 0;
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
  var ordinaryDays = 0;
  var shortWeekDays = 9;
  var longWeekDays = 10;
  let pay = 0;
  //displaying information to user
  var payDiv = document.getElementById("payDetails");
  //empty any existing text
  payDiv.innerText = "";

  //calculate hours and minutes worked
  timeWorked = calculateTimeWorked(tableArray);
  const totalHours = timeWorked[timeWorked.length - 1];
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
      ordinaryHours += timeWorked[i][1][0];
      ordinaryMinutes += timeWorked[i][1][1];
      document.getElementsByClassName("displayHours")[
        i
      ].value = `${timeWorked[i][1][0]}:${timeWorked[i][1][1]}`;
      if (timeWorked[i][4] !== "-") {
        dailyHours += timeWorked[i][4][0];
        dailyMinutes += timeWorked[i][4][1];
      }
      if (timeWorked[i][2] !== "-") {
        dailyHours += timeWorked[i][2][0];
        dailyMinutes += timeWorked[i][2][1];
      }
      if (timeWorked[i][3] !== "-") {
        dailyHours += timeWorked[i][3][0];
        dailyMinutes += timeWorked[i][3][1];
      }
      dailyMinutes = CheckDailyMinutes(dailyMinutes);
      grossHours += dailyHours;
      grossMinutes += dailyMinutes;
      grossMinutes = CheckGrossMinutes(grossMinutes);
      ordinaryMinutes = CheckOrdinaryMinutes(ordinaryMinutes);
      console.log(
        daysWorkedCounter +
          `: ` +
          dailyHours +
          ` ` +
          dailyMinutes +
          `||` +
          grossHours +
          ` ` +
          grossMinutes
      );

      //if shift starts after 0000 && finishes after start time && finishes before 2399
      //OR
      //if shift start time + timeworked110 < 2399
      //then the shift starts and finishes on the same day

      //excess shifts: overtime 150 on weekdays and 200 on weekends
      if (daysWorkedCounter > ordinaryDays) {
        console.log("over");
        //if its 1st or 2nd excess shift mon-fri, its 150%
        if (
          daysWorkedCounter <= ordinaryDays + 2 &&
          weekdays[i] !== "Saturday" &&
          weekdays[i] !== "Sunday"
        ) {
          dailyPayArray.push(
            rounded(
              timeWorked[i][1][0] * payRate +
                (minAsUnits(timeWorked[i][1][1]) / 100) * payRate * weekdayOT
            )
          );
          payDiv.innerText += ` Overtime @ 150%:  ${
            timeWorked[i][1][0]
          }.${minAsUnits(timeWorked[i][1][1])}: ${rounded(
            timeWorked[i][1][0] * payRate +
              (minAsUnits(timeWorked[i][1][1]) / 100) * payRate * weekdayOT
          )}   \n`;
        }
        //if its 3rd excess day or more, or weekend, its 200%
        if (
          daysWorkedCounter > ordinaryDays + 2 ||
          weekdays[i] === "Saturday" ||
          weekdays[i] === "Sunday"
        ) {
          dailyPayArray.push(
            rounded(
              rounded(
                timeWorked[i][1][0] * payRate +
                  (minAsUnits(timeWorked[i][1][1]) / 100) * payRate * weekendOT
              )
            )
          );
          payDiv.innerText += ` Overtime @ 200%:  ${
            timeWorked[i][1][0]
          }.${minAsUnits(timeWorked[i][1][1])}: ${rounded(
            timeWorked[i][1][0] * payRate +
              (minAsUnits(timeWorked[i][1][1]) / 100) * payRate * weekendOT
          )}   \n`;
        }
      }
      //calculating first 9/10 days ordinary hours
      if (daysWorkedCounter <= ordinaryDays) {
        console.log("under");
        //if shifts are over 8 hours
        if (dailyHours >= shiftLength) {
          //add 8 hours to normal pay
          dailyPayArray.push(rounded(shiftLength * payRate));
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
                (dailyHours - shiftLength) * payRate +
                  (minAsUnits(dailyMinutes) / 100) * payRate * weekendOT
              )
            );
            payDiv.innerText += ` Sched OT 200%:  ${
              dailyHours - shiftLength
            }.${minAsUnits(dailyMinutes)}: ${rounded(
              (dailyHours - shiftLength) * payRate +
                (minAsUnits(dailyMinutes) / 100) * payRate * weekendOT
            )}   \n`;
          } //otherwise scheduled OT is 150%;
          else {
            dailyPayArray.push(
              rounded(
                (dailyHours - shiftLength) * payRate +
                  (minAsUnits(dailyMinutes) / 100) * payRate * weekdayOT
              )
            );
            payDiv.innerText += ` Sched OT 150%:  ${
              dailyHours - shiftLength
            }.${minAsUnits(dailyMinutes)}: ${rounded(
              (dailyHours - shiftLength) * payRate +
                (minAsUnits(dailyMinutes) / 100) * payRate * weekdayOT
            )}   \n`;
          }
        } // if shift is 8 hours or under calculate normal pay
        else {
          dailyPayArray.push(
            rounded((dailyHours + minAsUnits(dailyMinutes) / 100) * payRate)
          );
          payDiv.innerText += ` Ordinary Hours:  ${dailyHours}.${minAsUnits(
            dailyMinutes
          )}: ${rounded(
            (dailyHours + minAsUnits(dailyMinutes) / 100) * payRate
          )}   \n`;
        }

        //LOADINGS BASED ON WORKING HOURS.
        //NEED TO REFACTOR TO ROUND UP OR DOWN THE MINUTES FOR AN EXTRA UNIT OF PAY
        if (weekdays[i] === "Saturday" && !tableArray[i][7]) {
          dailyPayArray.push(
            rounded(timeWorked[i][1][0] * payRate * satLoading)
          );
          payDiv.innerText += ` Loading @ 50% Saturday:  ${
            timeWorked[i][1][0]
          }: ${rounded(timeWorked[i][1][0] * payRate * satLoading)}   \n`;
          // add minutes rounded up or down
        }
        if (weekdays[i] === "Sunday" && !tableArray[i][7]) {
          dailyPayArray.push(
            rounded(timeWorked[i][1][0] * payRate * sunLoading)
          );
          payDiv.innerText += ` Loading @ 100% Sunday:  ${
            timeWorked[i][1][0]
          }: ${rounded(timeWorked[i][1][0] * payRate * sunLoading)}   \n`;
          // add minutes rounded up or down
        }
        if (tableArray[i][7]) {
          if (weekdays[i] === "Sunday" || weekdays[i] === "Saturday") {
            dailyPayArray.push(
              rounded(timeWorked[i][1][0] * payRate * sunLoading)
            );
            payDiv.innerText += ` PH Loading @ 100%:  ${
              timeWorked[i][1][0]
            }: ${rounded(timeWorked[i][1][0] * payRate * sunLoading)}   \n`;
            // add minutes rounded up or down
          } else {
            dailyPayArray.push(
              rounded(timeWorked[i][1][0] * payRate * satLoading)
            );
            payDiv.innerText += ` PH Loading @ 50%:  ${
              timeWorked[i][1][0]
            }: ${rounded(timeWorked[i][1][0] * payRate * satLoading)}   \n`;
            // add minutes rounded up or down
          }
        }
        //SHIFT ALLOWANCE PENALTIES
        //NEED TO REFACTOR TO ROUND UP OR DOWN THE MINUTES FOR AN EXTRA UNIT OF PAY
        //THIS TIMING MIGHT NEED TO BE FINE TUNED ESP IF SHIFT STARTS ON ONE DAY FINISHES NEXT
        else {
          if (tableArray[i][1] >= 400 && tableArray[i][1] <= 530) {
            console.log("its early morning shift!");
            dailyPayArray.push(
              rounded(timeWorked[i][1][0] * EarlyMorningShiftPenalty)
            );
            payDiv.innerText += ` Early Morning Shift Dvrs/Grds Hrl:  ${
              timeWorked[i][1][0]
            }: ${rounded(timeWorked[i][1][0] * EarlyMorningShiftPenalty)}   \n`;
            // add minutes rounded up or down
          }
          if (tableArray[i][1] < 1800 && tableArray[i][3] > 1800) {
            console.log("its arvo shift!");
            dailyPayArray.push(
              rounded(timeWorked[i][1][0] * AfternoonShiftPenalty)
            );
            payDiv.innerText += ` Afternoon Shift Dvrs/Grds Hrl:  ${
              timeWorked[i][1][0]
            }: ${rounded(timeWorked[i][1][0] * AfternoonShiftPenalty)}   \n`;
            // add minutes rounded up or down
          }
          if (
            (tableArray[i][1] <= 359 &&
              weekdays[i] !== "Saturday" &&
              weekdays[i] !== "Sunday") ||
            (tableArray[i][1] >= 1800 &&
              weekdays[i] !== "Saturday" &&
              weekdays[i] !== "Sunday")
          ) {
            dailyPayArray.push(
              rounded(timeWorked[i][1][0] * nightShiftPenalty)
            );
            payDiv.innerText += ` Night Shift Dvrs/Grds Hrl:  ${
              timeWorked[i][1][0]
            }: ${rounded(timeWorked[i][1][0] * nightShiftPenalty)}   \n`;
            //THIS TIMING MIGHT NEED TO BE FINE TUNED
          }
        }
        //SPECIAL SHIFT LOADING ONE UNIT PER SHIFT
        if (
          (tableArray[i][1] >= 101 &&
            tableArray[i][1] <= 359 &&
            weekdays[i] !== "Saturday" &&
            weekdays[i] !== "Sunday") ||
          (tableArray[i][3] >= 101 &&
            tableArray[i][3] <= 359 &&
            weekdays[i] !== "Saturday" &&
            weekdays[i] !== "Sunday") ||
          (tableArray[i][1] >= 101 &&
            tableArray[i][1] <= 359 &&
            !tableArray[i][7]) ||
          (tableArray[i][3] >= 101 &&
            tableArray[i][3] <= 359 &&
            !tableArray[i][7])
          //WHAT IF THE SHIFT STARTS ON A NON PH AND FINISHES ON A PH IN THE SPECIAL LOADING PERIOD?
        ) {
          dailyPayArray.push(specialLoading);
          payDiv.innerText += ` Special Loading Drvs/Grds:  1: ${specialLoading}   \n`;
        }
      }

      function CheckDailyMinutes(dailyMinutes) {
        if (dailyMinutes >= 60) {
          dailyHours += (dailyMinutes - (dailyMinutes % 60)) / 60;
          let temp = dailyMinutes % 60;
          dailyMinutes = temp;
        }
        return dailyMinutes;
      }

      function CheckGrossMinutes(grossMinutes) {
        if (grossMinutes >= 60) {
          grossHours += (grossMinutes - (grossMinutes % 60)) / 60;
          let temp = grossMinutes % 60;
          grossMinutes = temp;
        }
        return grossMinutes;
      }

      function CheckOrdinaryMinutes(ordinaryMinutes) {
        if (ordinaryMinutes >= 60) {
          ordinaryHours += (ordinaryMinutes - (ordinaryMinutes % 60)) / 60;
          let temp = ordinaryMinutes % 60;
          ordinaryMinutes = temp;
        }
        return ordinaryMinutes;
      }

      //add security if ticked
      //single unit per shift
      if (tableArray[i][4]) {
        dailyPayArray.push(securityAllowance);
        payDiv.innerText += ` Guards Security Allow:  1: ${securityAllowance}   \n`;
      }
      //add cab if ticked
      //single unit per shift
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

      dailyHours = 0;
      dailyMinutes = 0;

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
    grossHours -= 4;
    payDiv.innerText += ` \nAccrued Day Off - Adjustm:  4: ${rounded(
      adoAdjustment * -1
    )}   \n`;
  } else {
    payArray.push(rounded(adoAdjustment));
    grossHours += 4;
    payDiv.innerText += ` \nAccrued Day Off - Adjustm:  4: ${rounded(
      adoAdjustment
    )}   \n`;
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
};

function rounded(pay) {
  return Math.round((pay + Number.EPSILON) * 100) / 100;
}

function minAsUnits(minutes) {
  return Math.round((minutes / 60) * 100);
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
      //if actual starting time > rostered starting time
      if (row[0] < row[1]) {
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
      if (diff !== diffRostered && row[1] >= row[0] && row[3] < row[2]) {
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

  // console.log(totalTime);
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
