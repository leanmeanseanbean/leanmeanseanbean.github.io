//gets all input boxes in the table
storeData = () => {
  const table = document.querySelectorAll("input");
  const payRate = parseFloat(table[2].value);
  let role;
  let adoWeek;
  //driver or guard
  if (table[0].checked) {
    role = table[0].value;
  } else {
    role = table[1].value;
  }

  //long or short fortnight
  if (table[3].checked) {
    adoWeek = table[3].value;
  } else {
    adoWeek = table[4].value;
  }

  if (table[2].value.trim() === "") {
    alert("ENTER A PAY RATE!");
  } else if (table[0].checked == false && table[1].checked == false) {
    alert("ARE YOU A DRIVER OR GUARD?");
  } else if (table[3].checked == false && table[4].checked == false) {
    alert("IS IT A LONG OR SHORT FORTNIGHT?");
  } else {
    //array for all data in timesheet table
    let tableArray = [];
    //array for single row in table
    let rowArray = [];
    for (let i = 5; i < table.length; i++) {
      //determine if end of row
      if (table[i].readOnly) {
        tableArray.push(rowArray);
        rowArray = [];
        continue;
      }
      //if checkbox, see if its checked or not
      if (table[i].getAttribute("type") === "checkbox") {
        rowArray.push(table[i].checked);
        continue;
      }
      //else store the value of the input into the array for that row.
      rowArray.push(table[i].value.trim());
    }

    calculatePay(payRate, adoWeek, tableArray, role);
  }
};

//need to refactor to include a getMonth and getDate and getFullYear methods to calculate the payrises                                                                                                             

calculatePay = (payRate, adoWeek, tableArray, role) => {
  const payRise2022 = 0.0353;
  const payRise2023 = 0.0403;
  const payRise2024 = 0.0403;
  const WOBOD = 0.48;
  const securityAllowance = 5.75;
  const cabEtrAllowance = 7.4;
  const nsPenalty = 4.89;
  const nightShiftPenalty = rounded(nsPenalty+ (nsPenalty * payRise2022) + (nsPenalty * payRise2023));
  const emsPenalty = 4.15;
  const EarlyMorningShiftPenalty = rounded(emsPenalty + (emsPenalty * payRise2022) + (emsPenalty * payRise2023));
  const asPenalty = 4.15;
  const AfternoonShiftPenalty = rounded(asPenalty + (asPenalty * payRise2022) + (asPenalty * payRise2023));
  const callOutPenalty = 0.25;
  const weekdayOT = 1.5;
  const weekendOT = 2;
  const satLoading = 0.5;
  const sunLoading = 1;
  const adoAdjustment = payRate * 4;
  const sLoading = 4.89;
  const specialLoading = rounded(sLoading + (sLoading * payRise2022) + (sLoading * payRise2023));
  const shortWeekHours = 72;
  const longWeekHours = 80;
  const shiftLength = 8;
  var timeLost = 0;
  var baseHours = 76;
  const payArray = [];
  var dailyPayArray = [];
  var shortFall = 0;
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
    `Sunday`,
  ];
  const extraKmTiers = [
    16.093, 24.14, 32.187, 40.234, 48.281, 56.328, 64.375, 72.422, 80.469,
    88.516, 96.563, 104.61, 112.657, 120.704, 128.751, 136.798, 144.845,
    152.892,
  ];
  const extraKmTimesInUnits = [
    0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0,
    4.25, 4.5, 4.75, 5.0,
  ];
  const bonusOtRates = [100, 250, 400];
  const bonusOtShifts = [1, 2, 3];
  var GrossPay = 0;
  var daysWorkedCounter = 0;
  var ordinaryUnits = 0;
  var dailyUnits = 0;
  var ordinaryDays = 0;
  var shortWeekDays = 9;
  var longWeekDays = 10;
  var publicHoliday = false;
  var payPh = false;
  var security = false;
  var cab = false;
  var accruePh = false;
  var callOut = false;
  var overtime = false;
  var OTdays = 0;
  var wobodArray = [];
  var sickDays = 0;
  var milageShift = false;
  var milageUnits = 0;
  var milageBU = 0;
  var milageOTUnits = 0;
  var extraKm = 0;
  var extraKmAsUnits = 0;
  var offsetUnits = 0;
  var singleDay = true;
  var shiftStartUnits = 0;
  var shiftFinishUnits = 0;
  var startTimeRostered = 0;
  var startTimeActual = 0;
  var finishTimeRostered = 0;
  var finishTimeActual = 0;
  var shiftDay;
  var shiftDayFinish;
  var dayAfterPH = false;
  //displaying information to user
  var payDiv = document.getElementById("payDetails");
  var unitDiv = document.getElementById("unitDetails");
  var rateDiv = document.getElementById("rateDetails");
  var amountDiv = document.getElementById("amountDetails");
  //empty any existing text
  payDiv.innerText = "";
  unitDiv.innerText = ``;
  rateDiv.innerText = ``;
  amountDiv.innerText = ``;
  for (let i = 0; i < 14; i++) {
    document.getElementsByClassName("displayHours")[i].value = ``;
  }

  //calculate hours and minutes worked
  timeAsUnits = calculateTimeWorkedAsUnits(tableArray);
  // console.log(tableArray);
  // console.log(timeAsUnits);
  if (adoWeek === "long") {
    baseHours = longWeekHours;
    ordinaryDays = longWeekDays;
  } else {
    baseHours = shortWeekHours;
    ordinaryDays = shortWeekDays;
  }
  // format of tableArray =
  // [0] start time rostered - 1234
  // [1] start time actual - 1234
  // [2] finish time rostered - 1234
  // [3] finish time actual - 1234
  // [4] security - true/false
  // [5] cab - true/false
  // [6] 209km passed - 1234
  // [7] PH - true/false
  // [8] accrue PH - true/false
  // [9] Overtime - true/false
  // [10] callout - true/false
  // [11] extra Km's - 1234

  // format of timeAsUnits =
  // [0] Rostered start
  // [1] actual start,
  // [2] rostered finish,
  // [3] actual finish,
  // [4] shift length
  // [5] [time worked, which day start],
  // [6] [time worked, which day finish (IF ANY, <day>')],
  // [7] lift up (IF ANY, else 'no LU'),
  // [8] layback (IF ANY, else 'no lb'),
  // [9] buildup (IF ANY, else 'no BU')
  // [10] milage [209km time as units, time before 209km, buildup, time over 209km] (IF ANY, else 'No Milage')

  // TO DO'S:

  // CHECK EXTRA KM's AND EFFECT ON PH's.

  payDiv.innerText += ` \n Details \n`;
  unitDiv.innerText += ` \nUnits\n`;
  rateDiv.innerText += ` \nRate\n`;
  amountDiv.innerText += ` \nAmounts\n`;

  //CALCULATING DAILY HOURS
  for (let i = 0; i < timeAsUnits.length; i++) {
    // IF ITS NOT A DAY OFF
    if (timeAsUnits[i].length > 0) {
      //adding all the working time;
      payDiv.innerText += ` \n${weekdays[i]}: \n`;
      unitDiv.innerText += ` \n\n`;
      rateDiv.innerText += `\n\n`;
      amountDiv.innerText += ` \n\n`;

      if (timeAsUnits[i] !== "Hol") {
        dailyPayArray = [];
        daysWorkedCounter++;
        payPh = tableArray[i][7];
        accruePh = tableArray[i][8];
        security = tableArray[i][4];
        cab = tableArray[i][5];
        overtime = tableArray[i][9];
        callOut = tableArray[i][10];
        dailyUnits = timeAsUnits[i][4];
        startTimeRostered = timeAsUnits[i][0];
        startTimeActual = timeAsUnits[i][1];
        finishTimeRostered = timeAsUnits[i][2];
        finishTimeActual = timeAsUnits[i][3];
        shiftDay = weekdays[i]; 
        // console.log(shiftDay);
        if(timeAsUnits[i][1] !== "Sick"){
          shiftDayFinish = timeAsUnits[i][6][1];
          shiftStartUnits = timeAsUnits[i][5][0];
          shiftFinishUnits = timeAsUnits[i][6][0];
        }

        if (
          //IF THERE IS MILAGE ADD THE TIMES
          timeAsUnits[i][10] !== "No milage" &&
          timeAsUnits[i][1] !== "Sick"
        ) {
          milagePassedAt = timeAsUnits[i][10][0];
          milageUnits = timeAsUnits[i][10][1];
          milageBU = timeAsUnits[i][10][2];
          if (milageUnits < 8) {
            milageOTUnits = timeAsUnits[i][10][3];
          }
          offsetUnits += milageOTUnits;
          milageShift = true;
        }
        if(timeAsUnits[i][1] !== "Sick"){
        // IF THE DAY THE SHIFT STARTS AND FINISHES ARENT THE SAME, MULTI DAY SHIFT
        if (timeAsUnits[i][5][1] !== timeAsUnits[i][6][1]) {
          singleDay = false;
          if (i < 13) {
            if (
              tableArray[i + 1][7] ||
              tableArray[i + 1][8] ||
              timeAsUnits[i + 1] === "Hol"
            ) {
              dayAfterPH = true;
            }
          }
        } 
      }
        // CALCULATE ORDINARY TIME FOR 9/10 DAYS IN FORTNIGHT
        if (daysWorkedCounter <= ordinaryDays) {
          if(dailyUnits > 0){
            ordinaryUnits += dailyUnits;
            // console.log("normal hours: " + ordinaryUnits + " - " + dailyUnits);
          }
        }
      }

      if (accruePh || payPh) {
        publicHoliday = true;
      } else {
        publicHoliday = false;
      }

      //display time worked in the timesheet
      if (timeAsUnits[i].length > 5) {
        document.getElementsByClassName("displayHours")[
          i
        ].value = `${Math.trunc(dailyUnits)}'${Math.round(
          (dailyUnits - Math.trunc(dailyUnits)) * 60
        )}"`;
      }

      //add offset times for ordinary hours
      if (timeAsUnits[i].length > 5) {
        //buildup
        if (timeAsUnits[i][9] !== "no buildup") {
          //build up as units
          BU = timeAsUnits[i][9];
          offsetUnits += BU;
          if (daysWorkedCounter <= ordinaryDays) {
            ordinaryUnits += BU;
            // console.log("BU: " + ordinaryUnits + " - " + BU);
          }
        }
        //liftup
        if (timeAsUnits[i][7] !== "no lift up") {
          //lift up as units
          LU = timeAsUnits[i][7];
          offsetUnits += LU;
          if (daysWorkedCounter <= ordinaryDays) {
            ordinaryUnits += LU;
            // console.log("LU: " + ordinaryUnits + " - " + LU);
          }
        }
        //layback
        if (timeAsUnits[i][8] !== "no layback") {
          //layback as units
          LB = timeAsUnits[i][8];
          offsetUnits += LB;
          if (daysWorkedCounter <= ordinaryDays) {
            ordinaryUnits += LB;
            // console.log("LB: " + ordinaryUnits + " - " + LB);
          }
        }

        //extra KM - drivers only
        if (role === "Driver") {
          if (tableArray[i][11] !== "") {
            extraKm = parseInt(tableArray[i][11]);
            for (let i = 0; i < extraKmTiers.length; i++) {
              //0 - 16.093kms
              if (extraKm < extraKmTiers[i] && i === 0)
                extraKmAsUnits = extraKmTimesInUnits[i];
              //16.094 - 152.892
              if (extraKm > extraKmTiers[i - 1] && extraKm <= extraKmTiers[i]) {
                extraKmAsUnits = extraKmTimesInUnits[i];
              }
              //152.893 and over by 8.046 increments of 15 minutes
              if (extraKm > extraKmTiers[i] && i === 17) {
                extraKmAsUnits = extraKmTimesInUnits[i];
                //how many additional increments of 15 minutes
                //Math.ceil()
                // multiply by 15 mins or .25 units
                let x = Math.ceil((extraKm - extraKmTiers[i]) / 8.046) * 0.25;
                extraKmAsUnits += x;
              }
            }
            offsetUnits += extraKmAsUnits;
          }
        }
      }

      //if not sick...
      // CALCULATE PAYMENTS
      if (timeAsUnits[i].length > 5) {
        //excess shifts: overtime 150 on weekdays and 200 on weekends
        if (daysWorkedCounter > ordinaryDays) {
          if (singleDay) {
            //if its 1st or 2nd excess shift mon-fri, or a public holiday that isnt a saturday its 150%
            if (daysWorkedCounter <= ordinaryDays + 2) {
              //weekday 150%
              if (weekdays[i] !== "Saturday") {
                excessWeekday(dailyUnits + BU + LU + LB + extraKmAsUnits);
              }
              //saturday max 200%
              if (weekdays[i] === "Saturday" || weekdays[i] === "Sunday") {
                excessWeekend(dailyUnits + BU + LU + LB + extraKmAsUnits);
              }
              // public holiday loading 50% - applicable on weekdays + sat only
              if (publicHoliday && weekdays[i] !== "Saturday") {
                PHweekday(dailyUnits);
              }
            }
            //if its 3rd excess day or more, or weekend, its 200%
            if (daysWorkedCounter > ordinaryDays + 2) {
              excessWeekend(dailyUnits + BU + LU + LB + extraKmAsUnits);
            }
            if (milageBU > 0) {
              milageBuildUp(milageBU);
            }
          }
          if (!singleDay) {
            if (daysWorkedCounter <= ordinaryDays + 2) {
              //if shift starts on weekday - 150%
              if (shiftDay !== "Saturday") {
                if (shiftDayFinish !== "Saturday") {
                  excessWeekday(
                    shiftStartUnits +
                      shiftFinishUnits +
                      LB +
                      LU +
                      BU +
                      extraKmAsUnits
                  );
                }
                //and finishes on a weekend - 200%
                if (shiftDayFinish === "Saturday") {
                  excessWeekday(shiftStartUnits + LB);
                  excessWeekend(shiftFinishUnits + LU + BU + extraKmAsUnits);
                }
                //if day finishes is a weekday PH - 50% PH loading to total of 200%
                if (
                  dayAfterPH &&
                  shiftDayFinish !== "Saturday" &&
                  shiftDayFinish !== "Sunday"
                ) {
                  PHweekday(shiftFinishUnits);
                }
              }
              //if shift starts on a saturday and finishes on sunday, its all 200%
              if (shiftDay === "Saturday") {
                excessWeekend(dailyUnits + BU + LU + LB + extraKmAsUnits);
              }
              if (publicHoliday && shiftDay !== "Saturday") {
                PHweekday(shiftStartUnits);
              }
            }
            if (daysWorkedCounter > ordinaryDays + 2) {
              //all 200%
              excessWeekend(dailyUnits + BU + LU + LB + extraKmAsUnits);
            }
            if (milageBU > 0) {
              milageBuildUp(milageBU);
            }
          }
        }
        //calculating first 9/10 days ordinary hours
        if (daysWorkedCounter <= ordinaryDays) {
          //singleDay
          if (singleDay) {
            //CHANGE THIS BACK TO SINGLEDAY WHEN ITS FIXED
            // if (true) {
            //IF THERE IS NO MILAGE
            if (timeAsUnits[i][10] === "No milage") {
              ShiftPay(dailyUnits + BU + LU + LB + extraKmAsUnits);
            }
            //IF THERE IS MILAGE
            if (timeAsUnits[i][10] !== "No milage") {
              //shifts total over 8 hours and 209km passed before 8 hours
              if (milageUnits < 8) {
                // weekday non ph, all OT is 150%
                if (
                  weekdays[i] !== "Saturday" &&
                  weekdays[i] !== "Sunday" &&
                  !publicHoliday
                ) {
                  NormalPay(shiftLength);
                  MilagePayment(milageOTUnits);

                  //excess is 150% on weekdays eg - 30" + any LU LB BU etc
                  if (BU + LU + LB + extraKmAsUnits > 0) {
                    OneHalfOT(BU + LU + LB + extraKmAsUnits);

                  }
                }
                // saturday or weekday ph - 150% to 8 hours, over 8 OT is 200%
                if (
                  (weekdays[i] === "Saturday" && !publicHoliday) ||
                  (weekdays[i] !== "Sunday" &&
                    weekdays[i] !== "Saturday" &&
                    publicHoliday)
                ) {
                  NormalPay(shiftLength);
                  MilagePayment(milageOTUnits);

                  // excess over 8 hours is 200%
                  if (BU + LU + LB + extraKmAsUnits > 0) {
                    DoubleOT(BU + LU + LB + extraKmAsUnits);

                  }
                }
                // sat PH = 200% max, sunday = 200% max
                if (
                  weekdays[i] === "Sunday" ||
                  (weekdays[i] === "Saturday" && publicHoliday)
                ) {
                  //milage eg 7'30"
                  NormalPay(shiftLength);

                  // excess is 200%
                  DoubleOT(milageOTUnits + BU + LU + LB + extraKmAsUnits);
      
                }
              }
              //no milage
              if (milageUnits >= 8) {
                // weekday non ph, all OT is 150%
                if (
                  weekdays[i] !== "Saturday" &&
                  weekdays[i] !== "Sunday" &&
                  !publicHoliday
                ) {
                  NormalPay(shiftLength);
          
                  //excess is 150% on weekdays eg - 30" + any LU LB BU etc
                  OneHalfOT(
                    dailyUnits - shiftLength + BU + LU + LB + extraKmAsUnits
                  );
                } else {
                  NormalPay(shiftLength);
                  DoubleOT(
                    dailyUnits - shiftLength + BU + LU + LB + extraKmAsUnits
                  );
                }
              }
              if (
                callOut &&
                weekdays[i] !== "Saturday" &&
                weekdays[i] !== "Sunday"
              ) {
                ApplyCallOut(dailyUnits + BU + LU + LB + extraKmAsUnits);
              }
            }
            //LOADINGS BASED ON ACTUAL HOURS WORKED + LAYBACK
            //NEED TO REFACTOR TO ROUND UP OR DOWN THE MINUTES FOR AN EXTRA UNIT OF PAY - 30 MINUTES IS DOWN
            // saturday loading
            if (shiftDay === "Saturday" && !publicHoliday) {
              saturdayLoading(dailyUnits);
            }
            // sunday loading
            if (shiftDay === "Sunday" && !publicHoliday) {
              sundayLoading(dailyUnits);
            }
            // public holiday loading
            if (publicHoliday) {
              // weekend PH is 100%
              if (weekdays[i] === "Sunday" || weekdays[i] === "Saturday") {
                PHsunday(dailyUnits);
              } else {
                PHweekday(dailyUnits);
              }
            }
            //SHIFT ALLOWANCE PENALTIES - ONLY ON WEEKDAYS
            if (
              shiftDay !== "Sunday" &&
              shiftDay !== "Saturday" &&
              !publicHoliday &&
              !callOut
            ) {
              morningPenalty(dailyUnits);
              afternoonPenalty(dailyUnits);
              nightPenalty(dailyUnits);
              specialLoadingPenalty();
            }
          }
          if (!singleDay) {
            //starts on weekday
            if (shiftDay !== "Saturday" && shiftDay !== "Sunday") {
              // NormalPay(shiftStartUnits + LB);
              //shift that is over 8 hours is 150% OT on weekdays but 200% OT on saturday
              //so we can normal pay up to 8 hours
              //if there is milage
              if (milageBU > 0) {
                NormalPay(milageUnits + LB);
                //add milage buildup
                milageBuildUp(milageBU);
                // if the milage happens on the first day
                if (milageUnits < shiftStartUnits) {
                  //and the shift finishes on a saturday no PH
                  if (shiftDayFinish === "Saturday" && !dayAfterPH) {
                    //penalty is 150% for the first 8 hours, even on a non PH saturday
                    MilagePayment(milageBU);
                    //until after 8 hours saturday when it becomes 200%
                    doubleOT(
                      shiftFinishUnits - milageBU + LU + BU + extraKmAsUnits
                    );
                  }
                  // but if the shift finishes on a PH saturday
                  if (shiftDayFinish === "Saturday" && dayAfterPH) {
                    //there is a penalty only for the weekday portion of the shift
                    MilagePayment(shiftStartUnits - milageUnits);
                    doubleOT(shiftFinishUnits + LU + LB + extraKmAsUnits);
                  }
                  //but if the shift finishes on a weekday
                  if (shiftDayFinish !== "Saturday") {
                    if (dailyUnits + BU + LU + LB + extraKmAsUnits <= 8) {
                      NormalPay(dailyUnits + BU + LU + LB + extraKmAsUnits);
                    }
                    //its all 150% until 8 hours
                    if (
                      dailyUnits + BU + LU + LB + extraKmAsUnits > 8 &&
                      dailyUnits + BU + LU + LB + extraKmAsUnits <= 11
                    ) {
                      MilagePayment(milageBU);
                      OneHalfOT(
                        shiftFinishUnits - milageBU + LU + BU + extraKmAsUnits
                      );
                    }
                    //200% after 8 hours
                    if (dailyUnits + BU + LU + LB + extraKmAsUnits > 11) {
                      MilagePayment(milageBU);
                      OneHalfOT(3);
                      DoubleOT(dailyUnits + BU + LU + extraKmAsUnits - 11);
                    }
                  }
                }
                //if the milage occurs on the next day
                if (milageUnits > shiftStartUnits) {
                  //and the shift finishes on a saturday no PH
                  if (shiftDayFinish === "Saturday" && !dayAfterPH) {
                    //penalty is 150% for the first 8 hours, even on a non PH saturday
                    MilagePayment(milageBU);
                    //until after 8 hours saturday when it becomes 200%
                    DoubleOT(
                      shiftFinishUnits - milageBU + LU + BU + extraKmAsUnits
                    );
                  }
                  //if the shift finishes on a PH saturday
                  if (shiftDayFinish === "Saturday" && dayAfterPH) {
                    //there is no milage penalty for sat PH, only the buildup payment
                    //but everything after the milage unit is 200%
                    DoubleOT(
                      dailyUnits - milageUnits + LU + LB + extraKmAsUnits
                    );
                  }
                  //if the shift finishes on a weekday
                  if (shiftDayFinish !== "Saturday") {
                    if (
                      dailyUnits + BU + LU + LB + extraKmAsUnits > 8 &&
                      dailyUnits + BU + LU + LB + extraKmAsUnits <= 11
                    ) {
                      MilagePayment(milageBU);
                      OneHalfOT(
                        shiftFinishUnits - milageBU + LU + BU + extraKmAsUnits
                      );
                    }
                    //200% after 8 hours
                    if (dailyUnits + BU + LU + LB + extraKmAsUnits > 11) {
                      MilagePayment(milageBU);
                      OneHalfOT(3);
                      DoubleOT(dailyUnits + BU + LU + LB + extraKmAsUnits - 11);
                    }
                  }
                }
              }
              //if there is no milage
              if (milageBU === 0) {
                //if next day is weekday
                if (shiftDayFinish !== "Saturday") {
                  //normal pay for shifts up to 8 hours
                  if (
                    dailyUnits +
                      LU +
                      BU +
                      LB +
                      extraKmAsUnits <=
                    shiftLength
                  ) {
                    NormalPay(dailyUnits + LB + LU + BU + extraKmAsUnits);
                  }
                  //OT 150% after 8 hours
                  if (
                    dailyUnits + LU + BU + LB + extraKmAsUnits > shiftLength &&
                    dailyUnits + LU + BU + LB + extraKmAsUnits < 11
                  ) {
                    //HOW DOES LAY BACK GET PAID? ATM ITS GIVING TOTAL OF 8.5 HOURS AT NORMAL PAY
                    NormalPay(shiftLength);
                    OneHalfOT(
                      dailyUnits - shiftLength + BU + LU + LB + extraKmAsUnits
                    );
                  }
                  //OT 200% after 11 hours
                  if (dailyUnits + LU + BU + LB + extraKmAsUnits > 11) {
                    NormalPay(shiftLength);
                    OneHalfOT(3);
                    DoubleOT(dailyUnits + BU + LU + LB + extraKmAsUnits - 11);
                  }
                }
                //if next day is saturday
                if (shiftDayFinish === "Saturday") {
                  //normal pay for shifts up to 8 hours
                  if (
                    dailyUnits + LU + BU + LB + extraKmAsUnits <=
                    shiftLength
                  ) {
                    NormalPay(dailyUnits + LU + BU + LB + extraKmAsUnits);
                  }
                  //OT 200% after 8 hours
                  if (
                    dailyUnits + LU + BU + LB + extraKmAsUnits >
                    shiftLength
                  ) {
                    NormalPay(shiftLength);
                    DoubleOT(
                      dailyUnits - shiftLength + LU + BU + LB + extraKmAsUnits
                    );
                  }
                }
              }
              if ( //if normal weekday and finishes on normal weekday
                !publicHoliday &&
                !callOut
              ) {
                if(shiftDayFinish !== "Saturday" &&
                !dayAfterPH){
                  morningPenalty(dailyUnits);
                  afternoonPenalty(dailyUnits);
                  nightPenalty(dailyUnits);
                  specialLoadingPenalty();
                }
                if(shiftDayFinish !== "Saturday" &&
                dayAfterPH){
                  morningPenalty(shiftStartUnits);
                  afternoonPenalty(shiftStartUnits);
                  nightPenalty(shiftStartUnits);
                  PHweekday(shiftFinishUnits);
                }
                if(shiftDayFinish === "Saturday" && !dayAfterPH){
                  morningPenalty(shiftStartUnits);
                  afternoonPenalty(shiftStartUnits);
                  nightPenalty(shiftStartUnits);
                  specialLoadingPenalty();
                  saturdayLoading(shiftFinishUnits);
                }
              } //if public holiday and finishes on a saturday
              if (publicHoliday && shiftDayFinish === "Saturday") {
                if(dailyUnits < 8.5){
                  saturdayLoading(shiftFinishUnits);
                }
                else if(dailyUnits >= 8.5){
                  saturdayLoading(shiftLength - Math.round(shiftStartUnits));
                }
              }
              if (publicHoliday && shiftDayFinish !== "Saturday" && !dayAfterPH) {
                if(dailyUnits < 8.5){
                morningPenalty(shiftFinishUnits);
                nightPenalty(shiftFinishUnits);
                afternoonPenalty(shiftFinishUnits);
                }
                if(dailyUnits >= 8.5){
                morningPenalty(shiftLength - Math.round(shiftStartUnits));
                nightPenalty(shiftLength - Math.round(shiftStartUnits));
                afternoonPenalty(shiftLength - Math.round(shiftStartUnits));
                }
              }
              if (callOut) {
                if (shiftDayFinish !== "Saturday") {
                  ApplyCallOut(dailyUnits);
                }
                if (shiftDayFinish === "Saturday") {
                  if(dailyUnits < 8.5){
                    ApplyCallOut(shiftStartUnits);
                    saturdayLoading(shiftFinishUnits);
                  }
                  if(dailyUnits >= 8.5){
                    ApplyCallOut(shiftStartUnits);
                    saturdayLoading(shiftLength - Math.round(shiftStartUnits));
                  }
                }
              }
              if (publicHoliday) {
                if (dayAfterPH) {
                  PHweekday(dailyUnits);
                }
                if (!dayAfterPH) {
                  PHweekday(shiftStartUnits);
                }
              }
            }
            //sat to sun
            if (shiftDay === "Saturday") {
              if (dailyUnits + LB + LU + BU + extraKmAsUnits <= shiftLength) {
                NormalPay(shiftFinishUnits + shiftStartUnits + LB + LU + BU + extraKmAsUnits);
              }
              if (dailyUnits + LB + LU + BU + extraKmAsUnits > shiftLength) {
                NormalPay(shiftLength);
                DoubleOT(
                  dailyUnits + LB + LU + BU + extraKmAsUnits - shiftLength
                );
              }
              //if there is milage
              if (milageBU > 0) {
                //add milage buildup
                milageBuildUp(milageBU);
                //and milage occurs on the first day before midnight aka sunday
                if (milageUnits < shiftStartUnits) {
                  //if its not a PH, add the milage penalty for any remaining saturday shift time over the milage time
                  //penalty does not apply on PH
                  if (!publicHoliday) {
                    MilagePayment(shiftStartUnits - milageUnits);
                  }
                }
                // if milage occurs on sunday there is no penalty
              }
              //if not a PH, add saturday loading for saturday portion of shift
              if (!publicHoliday) {
                saturdayLoading(shiftStartUnits + LB);
                // if finish day is non PH sunday, add sunday loading
                if (!dayAfterPH) {
                  if(dailyUnits < 8.5){
                    sundayLoading(shiftFinishUnits);
                  }
                  if(dailyUnits >= 8.5){
                    sundayLoading(shiftLength - Math.round(shiftStartUnits));
                  }
                }
                if (dayAfterPH) {
                  if(dailyUnits < 8.5){
                    PHsunday(shiftFinishUnits)
                  }
                  if(dailyUnits >= 8.5){
                    PHsunday(shiftLength - Math.round(shiftStartUnits));
                  }
                }
              }
              // public holiday loading
              if (publicHoliday) {
                // weekend PH is 100%
                if (dayAfterPH) {
                  PHsunday(dailyUnits);
                }
                if(!dayAfterPH){
                  if(dailyUnits < 8.5){
                  PHsunday(shiftStartUnits);
                  sundayLoading(shiftFinishUnits);
                  }
                  if(dailyUnits >= 8.5){
                    PHsunday(shiftStartUnits);
                  sundayLoading(shiftLength - Math.round(shiftStartUnits));
                  }
                }
              }
            }
            //sun to mon
            if (shiftDay === "Sunday") {
              //200% to 100%
              //add sunday time
              if (dailyUnits + LB + LU + BU + extraKmAsUnits <= shiftLength) {
                NormalPay(dailyUnits + LB + LU + BU + extraKmAsUnits);
              }
              //add monday time
              if (
                dailyUnits + LB + LU + BU + extraKmAsUnits > shiftLength &&
                dailyUnits + LB + LU + BU + extraKmAsUnits < 11
              ) {
                // alert("B");
                NormalPay(shiftLength);
                OneHalfOT(
                  dailyUnits + LU + BU + LB + extraKmAsUnits - shiftLength
                );
              }
              if (dailyUnits + LB + LU + BU + extraKmAsUnits > 11) {
                // alert("C");
                NormalPay(shiftLength);
                OneHalfOT(3);
                DoubleOT(dailyUnits + LU + BU + LB + extraKmAsUnits - 11);
              }
              //if there is milage
              if (milageBU > 0) {
                //add penalty
                milageBuildUp(milageBU);
                //no milage penalty on sunday
                //if milage is on the monday, add the penalty
                if (milageUnits >= shiftStartUnits) {
                  MilagePayment(milageOTUnits);
                }
              }
              // if day isnt a PH
              if (!publicHoliday) {
                sundayLoading(LB + shiftStartUnits);
                if (!dayAfterPH) {
                  // if(dailyUnits < 8.5){
                  //   afternoonPenalty(shiftFinishUnits);
                  //   nightPenalty(shiftFinishUnits);
                  // }
                  // if(dailyUnits >= 8.5){
                  //   afternoonPenalty(shiftLength - Math.round(shiftStartUnits));
                  //   nightPenalty(shiftLength - Math.round(shiftStartUnits));
                  // }
                  specialLoadingPenalty();
                }
                if (dayAfterPH) {
                  PHweekday(shiftFinishUnits);
                  if(dailyUnits < 8.5){
                    PHweekday(shiftFinishUnits);
                  }
                  if(dailyUnits >= 8.5){
                    PHweekday(shiftLength - Math.round(shiftStartUnits));
                  }
                }
              }

              // if day IS a ph
              if (publicHoliday) {
                PHsunday(shiftStartUnits);
                // weekend PH is 100%
                if (dayAfterPH) {
                  if(dailyUnits < 8.5){
                    PHweekday(shiftFinishUnits);
                  }
                  if(dailyUnits >= 8.5){
                    PHweekday(shiftLength - Math.round(shiftStartUnits));
                  }
                }
                if(!dayAfterPH){
                  if(dailyUnits < 8.5){
                    afternoonPenalty(shiftFinishUnits);
                  nightPenalty(shiftFinishUnits);
                  }
                  if(dailyUnits >= 8.5){
                    afternoonPenalty(shiftLength - Math.round(shiftStartUnits));
                  nightPenalty(shiftLength - Math.round(shiftStartUnits));
                  }
                  specialLoadingPenalty();
                }
              }
            }
          }
        }
        // THERE IS NO MORE SECURITY OR CAB
        // securityAllownace();
        // cabAllowance();
        PHWorkAccrue();
        //print working time and running total
        // console.log(
        //   daysWorkedCounter +
        //     `: daily Units: ` +
        //     rounded(dailyUnits + BU + LU + LB) +
        //     `||  total Units: ` +
        //     rounded(ordinaryUnits)
        // );
      } else {
        //SICK
        //WHAT HAPPENS TO PUBLIC HOLIDAY IF SICK??????
        if (timeAsUnits[i][1] === "Sick") {
          sickDay();
        }
        //HOL
        if (timeAsUnits[i] === "Hol") {
          HOLpayment();
        }
      }

      //Drivers OT Bonus + Guards Wobod counter
      if (overtime) {
        OTdays++;
        wobodArray.push([weekdays[i], dailyUnits, callOut]);
      }

      //reset daily counters
      dailyUnits = 0;
      BU = 0;
      LU = 0;
      LB = 0;
      milageBU = 0;
      milageOTUnits = 0;
      extraKm = 0;
      extraKmAsUnits = 0;
      singleDay = true;
      milageShift = false;
      dayAfterPH = false;

      payArray.push(dailyPayArray);
      dailyPayArray = [];
    }
    // IF IT IS A DAY OFF
    else {
      dailyPayArray = [];
      // console.log("day off");
      payDiv.innerText += ` \n${weekdays[i]}:  DAY OFF\n`;
      unitDiv.innerText += ` \n\n`;
      rateDiv.innerText += `\n\n`;
      amountDiv.innerText += ` \n\n`;

      // PUBLIC HOLIDAY ON A DAY OFF
      payPh = tableArray[i][7];
      accruePh = tableArray[i][8];
      if (accruePh || payPh) {
        publicHoliday = true;
      } else {
        publicHoliday = false;
      }
      PHWorkAccrue();

      payArray.push(dailyPayArray);
      dailyPayArray = [];
    }
  }

  // THINGS THAT HAPPEN REGARDLESS OF THE DAY
  adjustADO(); // DOES IT MATTER WHERE THE ADO IS IN THE FORTNIGHT??
  guaranteePayment();
  payWOBOD();
  // NO MORE OT BONUS
  // OTBonus();

  //gross pay
  for (let i = 0; i < payArray.length; i++) {
    for (let j = 0; j < payArray[i].length; j++) {
      GrossPay += payArray[i][j];
    }
    if (i === 14) {
      GrossPay += payArray[i];
    }
  }
  GrossPay += shortFall * payRate;
  // console.log(GrossPay);
  payDiv.innerText += ` \n Gross Pay:\n`;
  unitDiv.innerText += ` \n\n`;
  rateDiv.innerText += `\n\n`;
  amountDiv.innerText += ` \n  ${rounded(GrossPay)}   \n`;

  function morningPenalty(hours) {
    if (Math.round(hours) >= 8) {
      hours = 8;
    }
    if (startTimeActual >= 4 && startTimeActual <= 5.5) {
      dailyPayArray.push(Math.round(hours) * EarlyMorningShiftPenalty);
      payDiv.innerText += ` Morning Shift Dvrs/Grds Hrl: ......................................................................................\n`;
      unitDiv.innerText += `${Math.round(hours)}: ...................................................................................................\n`;
      rateDiv.innerText += `${EarlyMorningShiftPenalty}...................................................................................................\n`;
      amountDiv.innerText += `${rounded(Math.round(hours) * EarlyMorningShiftPenalty)}\n`;
    }
  }

  function afternoonPenalty(hours) {
    if (Math.round(hours) >= 8) {
      hours = 8;
    }
    if (startTimeActual < 18 && finishTimeActual > 18 || startTimeActual < 18 && finishTimeActual < startTimeActual && (finishTimeActual + 24) > 18) {
      dailyPayArray.push(Math.round(hours) * AfternoonShiftPenalty);
      payDiv.innerText += `Afternoon Shift Dvrs/Grds Hrl: ......................................................................................\n`;
      unitDiv.innerText += `${Math.round(hours)}: .................................................................................................................\n`;
      rateDiv.innerText += `${AfternoonShiftPenalty}...................................................................................................\n`;
      amountDiv.innerText += `${rounded(Math.round(hours) * AfternoonShiftPenalty)}\n`;
    }
  }

  function nightPenalty(hours) {
    if (Math.round(hours) >= 8) {
      hours = 8;
    }
    if (startTimeActual <= 3.98 || startTimeActual >= 18) {
      dailyPayArray.push(Math.round(hours) * nightShiftPenalty);
      payDiv.innerText += `Night Shift Dvrs/Grds Hrl: ......................................................................................\n`;
      unitDiv.innerText += `${Math.round(hours)}: .................................................................................................................\n`;
      rateDiv.innerText += `${nightShiftPenalty}...................................................................................................\n`;
      amountDiv.innerText += `${rounded(Math.round(hours) * nightShiftPenalty)}\n`;
    }
  }

  function specialLoadingPenalty() {
    if (
      (startTimeActual >= 1.02 && startTimeActual <= 3.98) ||
      (finishTimeActual >= 1.02 && finishTimeActual <= 3.98)
      //WHAT IF THE SHIFT STARTS ON A NON PH AND FINISHES ON A PH IN THE SPECIAL LOADING PERIOD?
    ) {
      dailyPayArray.push(specialLoading);
      payDiv.innerText += `Special Loading Drvs/Grds: ......................................................................................\n`;
      unitDiv.innerText += `1: .............................................................................................................\n`;
      rateDiv.innerText += `${specialLoading}...................................................................................................\n`;
      amountDiv.innerText += `${specialLoading}\n`;
    }
  }

  function payWOBOD() {
    if (role === "Guard" || role ==="Driver") {
      for (let i = 0; i < sickDays; i++) {
        wobodArray.shift();
      }
      //no callout - wobod = 48%
      wobodArray.forEach((wobodShift) => {
        let co = wobodShift[2];
        if (!co) {
          // console.log(
          //   `wobod payment next fortnite at 48% of ${
          //     wobodShift[0]
          //   }'s shift: ${rounded(wobodShift[1] * payRate * WOBOD)}`
          // );
          payDiv.innerText += `\nNEXT FORTNIGHT WOBOD PAYMENT: ...............................................................................................................................\n`;
          unitDiv.innerText += ` \n@${wobodShift[0]}......................................................................................................................................................\n`;
          rateDiv.innerText += `\n48%...................................................................................................\n`;
          amountDiv.innerText += ` \n${rounded(
            wobodShift[1] * payRate * WOBOD
          )}\n`;
        }
        // with callout - wobod = 23%
        else {
          // console.log(
          //   `wobod payment next fortnite at 23% of ${
          //     wobodShift[0]
          //   }'s shift: ${rounded(wobodShift[1] * payRate * 0.23)}`
          // );
          payDiv.innerText += `\nNEXT FORTNIGHT WOBOD PAYMENT: ...............................................................................................................................\n`;
          unitDiv.innerText += ` \n@${wobodShift[0]}......................................................................................................................................................\n`;
          rateDiv.innerText += `\n23%...................................................................................................\n`;
          amountDiv.innerText += ` \n${rounded(
            wobodShift[1] * payRate * 0.23
          )}\n`;
        }
      });
    }
  }

  function OTBonus() {
    if (role === "Driver") {
      if (OTdays - sickDays > 0 && OTdays - sickDays < 4) {
        for (let i = 0; i < bonusOtShifts.length; i++) {
          if (OTdays === bonusOtShifts[i]) {
            // console.log(
            //   `Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
            //     OTdays - sickDays
            //   }. OT Bonus = ${bonusOtRates[i]}`
            // );
            payDiv.innerText += `Overtime Days: ${OTdays} - Days Sick: ${sickDays} =...............................................................................................................................\n`;
            unitDiv.innerText += ` \n${
              OTdays - sickDays
            }......................................................................................................................................................\n`;
            rateDiv.innerText += `\n${bonusOtRates[i]}...................................................................................................\n`;
            amountDiv.innerText += ` \n${bonusOtRates[i]}\n`;
          }
        }
      } else if (OTdays - sickDays >= 4) {
        // console.log(
        //   `Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
        //     OTdays - sickDays
        //   }. OT Bonus = ${bonusOtRates[2]}`
        // );
        payDiv.innerText += `Overtime Days: ${OTdays} - Days Sick: ${sickDays} =...............................................................................................................................\n`;
        unitDiv.innerText += ` \n${
          OTdays - sickDays
        }......................................................................................................................................................\n`;
        rateDiv.innerText += `\n${bonusOTRates[2]}...................................................................................................\n`;
        amountDiv.innerText += ` \n${bonusOtRates[2]}\n`;
      } else {
        // console.log(
        //   `Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
        //     OTdays - sickDays
        //   }. OT Bonus = $0.00`
        // );
      }
    }
  }

  function guaranteePayment() {
    if (ordinaryUnits + offsetUnits >= baseHours - timeLost) {
      //shortfall is the units
      // console.log(
      //   `worked hours: ${rounded(
      //     ordinaryUnits + offsetUnits
      //   )}.  Base hours: ${baseHours} - Time Lost: ${timeLost} = ${
      //     baseHours - timeLost
      //   }  Guarantee payment: None!`
      // );
      payArray.push(0);
    } else {
      shortFall = rounded(baseHours + timeLost - ordinaryUnits - offsetUnits);
      // console.log(`ordinary units: ${ordinaryUnits}`);
      // console.log(`Offset Units: ${offsetUnits}`);
      // console.log(`TimeLost: ${timeLost}`);
      // console.log(`shortfall: ${shortFall}`);
      // console.log(
      //   `worked hours: ${rounded(
      //     ordinaryUnits + offsetUnits
      //   )}.  Base hours: ${baseHours} - Time Lost: ${timeLost} = ${
      //     baseHours + timeLost
      //   }.  Guarantee payment: ${rounded(
      //     shortFall * payRate
      //   )} for ${shortFall} hours shortfall!`
      // );
      payArray.push(rounded(shortFall * payRate));
      payDiv.innerText += ` \nGuarantee: ...............................................................................................................................\n`;
      unitDiv.innerText += ` \n${shortFall}: ......................................................................................................................................................\n`;
      rateDiv.innerText += `\n${payRate}...................................................................................................\n`;
      amountDiv.innerText += ` \n${rounded(shortFall * payRate)}\n`;
    }
  }

  function adjustADO() {
    if (adoWeek === "long") {
      payArray.push(rounded(adoAdjustment * -1));
      payDiv.innerText += ` \nADO Adjustment: .............................................................................................................................................\n`;
      unitDiv.innerText += ` \n-4: ....................................................................................................................................................................\n`;
      rateDiv.innerText += `\n${payRate}...................................................................................................\n`;
      amountDiv.innerText += ` \n${rounded(adoAdjustment * -1)}\n`;
    } else {
      payArray.push(rounded(adoAdjustment));
      payDiv.innerText += ` \nADO Adjustment: ...............................................................................................................................\n`;
      unitDiv.innerText += ` \n4: ......................................................................................................................................................\n`;
      rateDiv.innerText += `\n${payRate}...................................................................................................\n`;
      amountDiv.innerText += ` \n${rounded(adoAdjustment)}\n`;
    }
  }

  function PHWorkAccrue() {
    // payout public holiday
    if (publicHoliday && !accruePh) {
      dailyPayArray.push(rounded(shiftLength * payRate));
      payDiv.innerText += `Public Holiday Paid: ......................................................................................\n`;
      unitDiv.innerText += `${shiftLength}: .........................................................................................................................................\n`;
      rateDiv.innerText += `${payRate}...................................................................................................\n`;
      amountDiv.innerText += `${rounded(shiftLength * payRate)}\n`;
    }
    // accrue public holiday, doesnt get paid.
    if (accruePh) {
      // console.log(
      //   "public holiday accrued up to 8 a year + 1 non proclaimed PH aka picnic day"
      // );
      payDiv.innerText += ` Public Holiday Accrued  \n`;
      unitDiv.innerText += `8\n`;
      rateDiv.innerText += `\n`;
      amountDiv.innerText += `\n`;
    }
  }

  function HOLpayment() {
    // console.log(`HOL - public holiday not required`);
    dailyPayArray.push(rounded(shiftLength * payRate));

    payDiv.innerText += `HOL: ............................................................................................................................................................\n`;
    unitDiv.innerText += `${shiftLength}: .......................................................................................................................................................\n`;
    rateDiv.innerText += `${payRate}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(shiftLength * payRate)}\n`;

    if (daysWorkedCounter <= ordinaryDays) {
      ordinaryUnits += rounded(shiftLength);
    //   console.log(
    //     "OT@200%: " + rounded(ordinaryUnits) + " - " + rounded(shiftLength)
    //   );
    }
  }

  function sickDay() {
    timeLost += dailyUnits;
    sickDays++;
    // console.log(`sick day - lost ${dailyUnits} of ordinary Time`);
    dailyPayArray.push(rounded(shiftLength * payRate));

    payDiv.innerText += `Sick: ..............................................................................................................................................\n`;
    unitDiv.innerText += `${shiftLength}: .........................................................................................................................................\n`;
    rateDiv.innerText += `${payRate}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(shiftLength * payRate)}\n`;
  }

  function cabAllowance() {
    if (cab) {
      dailyPayArray.push(cabEtrAllowance);
      payDiv.innerText += `Elec Guards Spl Shift All: ......................................................................................\n`;
      unitDiv.innerText += `1: ...........................................................................................................................\n`;
      rateDiv.innerText += `${cabEtrAllowance}...................................................................................................\n`;
      amountDiv.innerText += `${cabEtrAllowance}\n`;
    }
  }

  function securityAllownace() {
    if (security) {
      dailyPayArray.push(securityAllowance);
      payDiv.innerText += `Guards Security Allow: ......................................................................................\n`;
      unitDiv.innerText += `1: ...........................................................................................................................\n`;
      rateDiv.innerText += `${securityAllowance}...................................................................................................\n`;
      amountDiv.innerText += `${securityAllowance}\n`;
    }
  }

  function PHweekday(hours) {
    if (rounded(hours) >= shiftLength) {
      hours = shiftLength;
    }

    dailyPayArray.push(rounded(hours * payRate * satLoading));

    payDiv.innerText += ` PH Loading @ 50%: ......................................................................................\n`;
    unitDiv.innerText += `${Math.round(
      hours
    )}: .................................................................................................................\n`;
    rateDiv.innerText += `${payRate * satLoading}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(
      Math.round(hours) * payRate * satLoading
    )}\n`;
  }

  function PHsunday(hours) {
    if (Math.round(hours) >= shiftLength) {
      hours = shiftLength;
    }
    dailyPayArray.push(rounded(Math.round(hours) * payRate * sunLoading));
    payDiv.innerText += ` PH Loading @ 100%: ......................................................................................\n`;
    unitDiv.innerText += `${Math.round(hours)}: .................................................................................................................\n`;
    rateDiv.innerText += `${payRate * sunLoading}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(Math.round(hours) * payRate * sunLoading)}\n`;
  }

  function saturdayLoading(hours) {
    if (rounded(Math.round(hours)) >= shiftLength) {
      hours = shiftLength;
    }
    // dailyPayArray.push(rounded(Math.round(hours) * payRate * satLoading));
    dailyPayArray.push(rounded(hours * payRate * satLoading));
    payDiv.innerText += ` Loading @ 50% Saturday: ......................................................................................\n`;
    unitDiv.innerText += `${
      hours
    }: ...........................................................................................................................\n`;
    rateDiv.innerText += `${payRate * satLoading}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(
      hours * payRate * satLoading
    )}\n`;
  }

  function sundayLoading(hours) {
    if (rounded(Math.round(hours)) >= shiftLength) {
      hours = shiftLength;
    }
    // dailyPayArray.push(rounded(Math.round(hours) * payRate * sunLoading));
    dailyPayArray.push(rounded(hours * payRate * sunLoading));
    payDiv.innerText += ` Loading @ 100% Sunday: ......................................................................................\n`;
    unitDiv.innerText += `${
      hours
    }: .................................................................................................................\n`;
    rateDiv.innerText += `${payRate * sunLoading}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(
      hours * payRate * sunLoading
    )}\n`;
  }

  function excessWeekday(hours) {
    if (hours < 11) {
      dailyPayArray.push(rounded(hours * payRate * weekdayOT));

      payDiv.innerText += ` Overtime @ 150%: ........................................................................................ \n`;
      unitDiv.innerText += ` ${rounded(
        hours
      )}: ........................................................................................................................\n`;
      rateDiv.innerText += `${payRate*weekdayOT}...................................................................................................\n`;
      amountDiv.innerText += ` ${rounded(hours * payRate * weekdayOT)}\n`;
    }
    if (hours > 11) {
      //up to 11 hours is 150%
      dailyPayArray.push(rounded(11 * payRate * weekdayOT));

      payDiv.innerText += ` Overtime @ 150%: ................................................................................................  \n`;
      unitDiv.innerText += ` ${rounded(
        11
      )}: ...................................................................................................................................... \n`;
      rateDiv.innerText += `${payRate * weekdayOT}...................................................................................................\n`;
      amountDiv.innerText += ` ${rounded(11 * payRate * weekdayOT)}   \n`;
      // over 11 hours is 200%
      dailyPayArray.push(rounded((hours - 11) * payRate * weekendOT));

      payDiv.innerText += ` Overtime @ 200%: .................................................................................................  \n`;
      unitDiv.innerText += ` ${rounded(
        hours - 11
      )}: ...................................................................................................................................... \n`;
      rateDiv.innerText += `${payRate * weekdayOT}...................................................................................................\n`;
      amountDiv.innerText += `  ${rounded(
        (hours - 11) * payRate * weekdayOT
      )}   \n`;
    }
  }

  function excessWeekend(hours) {
    dailyPayArray.push(rounded(hours * payRate * weekendOT));

    payDiv.innerText += ` Overtime @ 200%: .................................................................................................  \n`;
    unitDiv.innerText += ` ${rounded(
      hours
    )}: ...................................................................................................................................... \n`;
    rateDiv.innerText += `${payRate * weekendOT}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(hours * payRate * weekendOT)}  \n`;
  }

  function milageBuildUp(milageBU) {
    dailyPayArray.push(rounded(milageBU * payRate));
    payDiv.innerText += `209km passed at ${Math.trunc(milagePassedAt)}'${Math.round(
      (milagePassedAt - Math.trunc(milagePassedAt)) * 60
    )} - Buildup: ...............................................................................................................  \n`;
    unitDiv.innerText += `  ${rounded(
      milageBU
    )}: .................................................................................................................................................... \n`;
    rateDiv.innerText += `${payRate}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(milageBU * payRate)}   \n`;
  }

  function ApplyCallOut(hours) {
    if (hours > shiftLength) {
      hours = shiftLength;
    }

    dailyPayArray.push(rounded(hours * payRate * callOutPenalty));
    payDiv.innerText += ` Callout @ 25%: ............................................................................................ \n`;
    unitDiv.innerText += ` ${hours}: .............................................................................................................................\n`;
    rateDiv.innerText += `${payRate * callOutPenalty}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(hours * payRate * callOutPenalty)} \n`;
  }

  function MilagePayment(milageOTUnits) {
    dailyPayArray.push(rounded(milageOTUnits * payRate * weekdayOT));
    payDiv.innerText += ` Milage payment 209k's: ..................................................................................\n`;
    unitDiv.innerText += ` ${rounded(milageOTUnits)}: ................................................................................................................................... \n`;
    rateDiv.innerText += `${payRate * weekendOT}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(milageOTUnits * payRate * weekdayOT)}\n`;
  }

  function DoubleOT(hours) {
    dailyPayArray.push(rounded(hours * payRate * weekendOT));
    //print the details
    payDiv.innerText += ` Sched OT 200%: ............................................................................................ \n`;
    unitDiv.innerText += ` ${rounded(
      hours
    )}: ...........................................................................................................................................\n`;
    rateDiv.innerText += `${payRate * weekendOT}...................................................................................................\n`;
    amountDiv.innerText += ` ${rounded(hours * payRate * weekendOT)}  \n`;

    //CALCULATE ORDINARY TIME
    //@200% its equal in 1:1 ratio
    if (daysWorkedCounter <= ordinaryDays) {
      ordinaryUnits += rounded(hours);
      // console.log(
      //   "OT@200%: " + rounded(ordinaryUnits) + " - " + rounded(hours)
      // );
    }
  }

  function OneHalfOT(hours) {
    dailyPayArray.push(rounded(hours * payRate * weekdayOT));
    //print the details
    payDiv.innerText += ` Sched OT 150%: ............................................................................................ \n`;
    unitDiv.innerText += ` ${rounded(
      hours
    )}: .............................................................................................................................\n`;
    rateDiv.innerText += `${payRate * weekdayOT}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(hours * payRate * weekdayOT)} \n`;
    //CALCULATE ORDINARY TIME
    //@150% its half the OT time
    if (daysWorkedCounter <= ordinaryDays) {
      ordinaryUnits += rounded(hours / 2);
      // console.log(
      //   "OT@100%: " + rounded(ordinaryUnits) + " - " + rounded(hours / 2)
      // );
    }
  }

  function NormalPay(hours) {
    if (hours >= shiftLength) {
      hours = shiftLength;
    }
    //milage eg 7'30"
    dailyPayArray.push(rounded(hours * payRate));
    if (publicHoliday) {
      payDiv.innerText += ` Public Holiday Worked: ....................................................................................................\n`;
    } else {
      payDiv.innerText += ` Ordinary Hours: ....................................................................................................\n`;
    }
    unitDiv.innerText += `  ${rounded(
      hours
    )}: ...........................................................................................................................\n`;
    rateDiv.innerText += `${payRate}...................................................................................................\n`;
    amountDiv.innerText += ` ${rounded(hours * payRate)}\n`;
  }

  function shiftWithOT(hours) {
    //8 hours to normal pay
    NormalPay(hours);

    //anything worked over 8 is scheduled OT,
    //weekend or PH is 200%
    if (shiftDay === "Saturday" || shiftDay === "Sunday" || publicHoliday) {
      DoubleOT(hours);
    }
    //weekday is 150%;
    if (shiftDay !== "Saturday" && shiftDay !== "Sunday" && !publicHoliday) {
      OneHalfOT(hours);
    }
    // call out on weekdays and non PH only
    if (callOut && shiftDay !== "Saturday" && shiftDay !== "Sunday") {
      ApplyCallOut(shiftLength);
    }
  }

  function shiftWithoutOT(hours) {
    NormalPay(hours);

    if (callOut && shiftDay !== "Saturday" && shiftDay !== "Sunday") {
      ApplyCallOut(hours);
    }
  }

  function ShiftPay(hours) {
    if (daysWorkedCounter <= ordinaryDays) {
      if (hours <= 8) {
        NormalPay(hours);
        if (callOut && shiftDay !== "Saturday" && shiftDay !== "Sunday") {
          ApplyCallOut(hours);
        }
      }
      if (hours > 8) {
        NormalPay(hours);
        if (shiftDay === "Saturday" || shiftDay === "Sunday" || publicHoliday) {
          DoubleOT(hours - shiftLength);
        }
        //weekday is 150%;
        if (
          shiftDay !== "Saturday" &&
          shiftDay !== "Sunday" &&
          !publicHoliday
        ) {
          OneHalfOT(hours - shiftLength);
        }
        // call out on weekdays and non PH only
        if (callOut && shiftDay !== "Saturday" && shiftDay !== "Sunday") {
          ApplyCallOut(shiftLength);
        }
      }
    }
  }
};

//rounds to 2 decimal places
function rounded(pay) {
  return Math.round((pay + Number.EPSILON) * 100) / 100;
}

//converts minutes to units
function AsUnits(minutes) {
  return Math.round((minutes / 60 + Number.EPSILON) * 100) / 100;
}

//converts units to minutes
function UnitsAsMinutes(units) {
  return Math.round(units * 60);
}

//rounds to integer?
function RoundedUnits(minutes) {
  return Math.round(minutes / 60);
}

calculateTimeWorkedAsUnits = (tableArray) => {
  const timeAsUnits = [];
  //format of timeWorked = Rostered hours, actual hours, lift up [IF ANY, else 0], layback [IF ANY, else 0], buildup [IF ANY, else 0]
  var rowTime = [];
  var startTimeInUnits = 0;
  var startTimeRosteredInUnits = 0;
  var finishTimeInUnits = 0;
  var finishTimeRosteredInUnits = 0;
  var milageTimeInUnits = 0;
  var finishNextDay = false;
  var liftUpExists = false;
  var layBackExists = false;
  var workedUnits = 0;
  var workedUnitsRostered = 0;
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
    `Sunday`,
  ];
  tableArray.forEach((row, index) => {
    //if day is empty, day off or HOL
    if (row[0] === "" || row[0].toUpperCase() === "HOL") {
      //check for HOL
      if (row[1].toUpperCase() === "HOL" || row[0].toUpperCase() === "HOL") {
        timeAsUnits.push("Hol");
      } else {
        timeAsUnits.push(rowTime);
      }
    }
    //normal days
    else {
      const x = [];

      //start time rostered as units
      let startTimeRostered = row[0].match(/.{2}/g);
      let startTimeRosteredInMinutes =
        parseInt(startTimeRostered[0]) * 60 + parseInt(startTimeRostered[1]);
      startTimeRosteredInUnits = rounded(startTimeRosteredInMinutes / 60);
      x.push(startTimeRosteredInUnits);

      if (row[1].toUpperCase() === "SICK") {
        x.push("Sick");
      } else {
        //start time actual as units
        let startTime = row[1].match(/.{2}/g);
        let startTimeInMinutes =
          parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
        startTimeInUnits = rounded(startTimeInMinutes / 60);
        x.push(startTimeInUnits);
      }

      // finish time rostered as units
      let finishTimeRostered = row[2].match(/.{2}/g);
      let finishTimeRosteredInMinutes =
        parseInt(finishTimeRostered[0]) * 60 + parseInt(finishTimeRostered[1]);
      finishTimeRosteredInUnits = rounded(finishTimeRosteredInMinutes / 60);
      x.push(finishTimeRosteredInUnits);

      //finish time actual as units
      //if the day is not a sick day
      if (row[3] !== null && row[1].toUpperCase() !== "SICK") {
        let finishTime = row[3].match(/.{2}/g);
        let finishTimeInMinutes =
          parseInt(finishTime[0]) * 60 + parseInt(finishTime[1]);
        finishTimeInUnits = rounded(finishTimeInMinutes / 60);
        x.push(finishTimeInUnits);
      } else {
        x.push("Sick");
      }

      //if the day is a sick day - calculate time lost
      
      if (row[1].toUpperCase() === "SICK") {
        //if finish time is less than start time
        //that means its a late shift that finishes the next morning
        //add 24 to the finish time and do the normal calculation of finish time - start time
        if (finishTimeRosteredInUnits < startTimeRosteredInUnits) {
          workedUnits = rounded(
            startTimeRosteredInUnits - (finishTimeRosteredInUnits + 24)
          );
          x.push(workedUnits);
        } else {
          //else just do the normal calculation of finish time- start time
          workedUnits = rounded(
            finishTimeRosteredInUnits - startTimeRosteredInUnits
          );
          x.push(workedUnits);
        }
      } else {
        //not sick, so calculate normal working hours

        //ACTUAL TIME WORKED as units
        //if finish time is less than start time
        //that means its a late shift that finishes the next morning
        //add 24 to the finish time and do the normal calculation of finish time - start time
        if (finishTimeInUnits < startTimeInUnits) {
          workedUnits = Math.abs(
            rounded(startTimeInUnits - (finishTimeInUnits + 24))
          );
          x.push(workedUnits);
          finishNextDay = true;
        } else {
          workedUnits = Math.abs(rounded(finishTimeInUnits - startTimeInUnits));
          x.push(workedUnits);
        }

        // WORK TIME ON START DAY
        if (finishTimeInUnits < startTimeInUnits) {
          x.push([workedUnits - finishTimeInUnits, weekdays[index]]);
        } else {
          x.push([workedUnits, weekdays[index]]);
        }

        // WORK TIME ON FINISH DAY
        //if finish time is less than start time
        //that means its a late shift that finishes the next morning
        //check that it isnt midnight exactly
        if (finishTimeRosteredInUnits < startTimeRosteredInUnits) {
          let result = Math.abs(startTimeInUnits + workedUnits - 24);
          if (result != 0) {
            x.push([result, weekdays[index + 1]]);
          } else {
            x.push([0, weekdays[index]]);
          }
        } else {
          x.push([0, weekdays[index]]);
        }

        if (finishTimeRosteredInUnits < startTimeRosteredInUnits) {
          workedUnitsRostered = Math.abs(
            rounded(startTimeRosteredInUnits - (finishTimeRosteredInUnits + 24))
          );
          finishNextDay = true;
        } else {
          workedUnitsRostered = rounded(
            finishTimeRosteredInUnits - startTimeRosteredInUnits
          );
        }

        //LU
        // start time is before rostered, finish time is before rostered
        if (
          startTimeInUnits < startTimeRosteredInUnits
        ) {
          // finish time is before rostered finish time and rostered finish time is < midnight
          if (finishTimeInUnits < finishTimeRosteredInUnits) {
            x.push(
              rounded(Math.abs(finishTimeRosteredInUnits - finishTimeInUnits))
            );
            liftUpExists = true;
          }
          else if ( //i.e 2330 actual vs 0030 rostered
            finishTimeInUnits > finishTimeRosteredInUnits &&
            finishTimeRosteredInUnits < startTimeRosteredInUnits
          ) {
            // if finish time is greater than rostered finish time means it finished same day but rostered finish next day
            // add 24 to finishTimeRosteredInUnits
            x.push(
              rounded(
                Math.abs(finishTimeRosteredInUnits + 24 - finishTimeInUnits)
              )
            );
            liftUpExists = true;
          }
          else {
            x.push(`no lift up`);
          }
        } else { 
          x.push(`no lift up`);
        }
        
        //LB
        if ( // if actual start time > rostered start time && actual finish time > rostered finish time eg. 
          startTimeInUnits > startTimeRosteredInUnits && finishTimeInUnits > finishTimeRosteredInUnits ||
          // if actual start time > rostered start time && finishes next day && layback + workedUnits + actual start time > workedUnitsRostered + rostered start time
          // 1545 | 1713 (1'28") till 2350 | 0138 (8'05" |8'25")
          startTimeInUnits > startTimeRosteredInUnits && finishNextDay && ((workedUnits + startTimeInUnits) > (workedUnitsRostered + startTimeRosteredInUnits))
        ) {
          x.push(rounded(startTimeInUnits - startTimeRosteredInUnits));
          layBackExists = true;
          LB = (rounded(startTimeInUnits - startTimeRosteredInUnits));
        } else {
          x.push(`no layback`);
        }

        // =====================  BU  ======================== //
        let bu = 0;
        //if start time actual >= start time rostered
        if(startTimeInUnits == startTimeRosteredInUnits){
          if((startTimeInUnits + workedUnits) < (startTimeRosteredInUnits + workedUnitsRostered)){
            bu = rounded((startTimeRosteredInUnits + workedUnitsRostered) - (startTimeInUnits + workedUnits));
            x.push(bu);
          }
          else {
            x.push(`no buildup`);
          }
        }
        else if(startTimeInUnits > startTimeRosteredInUnits){
          if((startTimeInUnits + workedUnits) == (startTimeRosteredInUnits + workedUnitsRostered)){
            bu = rounded(startTimeInUnits - startTimeRosteredInUnits);
            x.push(bu);
          }
          //if startTime + workedUnits < start time rostered + work time rostered
          else if((startTimeInUnits + workedUnits) < (startTimeRosteredInUnits + workedUnitsRostered)){
            bu = rounded((startTimeInUnits - startTimeRosteredInUnits) + ((startTimeRosteredInUnits + workedUnitsRostered) - (startTimeInUnits + workedUnits)));
            x.push(bu);
          }
          else {
            x.push(`no buildup`);
          }
        }
        else{
          x.push(`no buildup`);
        }

        // //if actual work time < rostered work time then there is build up
        // if (workedUnits < workedUnitsRostered) {
        //   //if !( actual start time < rostered start time ) i.e actual start time is equal or later than rostered start time, so same or lay back
        //   if(!LiftUpExists || !(startTimeInUnits < startTimeRosteredInUnits))
        //   {
        //     bu = rounded( workedUnits - workedUnitsRostered );
        //     x.push(bu);
        //   }
        //   else {
        //     x.push(`no buildup`);
        //   }
        //   // //if start time > rostered ie.layback
        //   // if (startTimeInUnits > startTimeRosteredInUnits) {
        //   //   //if finish time <= rostered eg 2200 - 2130 & 0200 0130 i.e. if shift is shorter than rostered
        //   //   if (finishTimeInUnits <= finishTimeRosteredInUnits) {
        //   //     bu = rounded(
        //   //       startTimeInUnits -
        //   //         startTimeRosteredInUnits +
        //   //         (finishTimeRosteredInUnits - finishTimeInUnits)
        //   //     );
        //   //     x.push(bu);
        //   //     // console.log(index + " a");
        //   //   }
        //   //   //if finish time rostered < start time && finish time > rostered finish eg . 0000 2330
        //   //   else if (
        //   //     finishTimeRosteredInUnits < startTimeRosteredInUnits &&
        //   //     finishTimeInUnits > finishTimeRosteredInUnits
        //   //   ) {
        //   //     bu = rounded(
        //   //       startTimeInUnits -
        //   //         startTimeRosteredInUnits +
        //   //         (finishTimeRosteredInUnits + 24 - finishTimeInUnits)
        //   //     );
        //   //     x.push(bu);
        //   //     // console.log(index + " b");
        //   //   }
        //   //   //if finish time is 
        //   //   else {
        //   //     bu = rounded( workedUnitsRostered - workedUnits );
        //   //     x.push(bu);
        //   //   }
        //   // }
        //   // //if start time = rostered
        //   // else if (startTimeInUnits === startTimeRosteredInUnits) {
        //   //   //if finish time < rostered eg 2200 - 2130 & 0200 0130
        //   //   if (finishTimeInUnits < finishTimeRosteredInUnits) {
        //   //     bu = rounded(finishTimeRosteredInUnits - finishTimeInUnits);
        //   //     x.push(bu);
        //   //     // console.log(index + " c");
        //   //   }
        //   //   //if finish time rostered < start time && finish time < rostered finish eg . 0000 2330
        //   //   else if (
        //   //     finishTimeRosteredInUnits < startTimeInUnits &&
        //   //     finishTimeInUnits > finishTimeRosteredInUnits
        //   //   ) {
        //   //     bu = rounded(finishTimeRosteredInUnits + 24 - finishTimeInUnits);
        //   //     x.push(bu);
        //   //     // console.log(index + " d");
        //   //   }
        //   // } else {
        //   //   x.push(`no buildup`);
        //   // }
        // } else {
        //   x.push(`no buildup`);
        // }

        // CALCULATE MILAGE
        if (row[6] !== "") {
          let milageArray = [];
          let milageTime = row[6].match(/.{2}/g);
          let milageTimeInMinutes =
            parseInt(milageTime[0]) * 60 + parseInt(milageTime[1]);
          milageTimeInUnits = rounded(milageTimeInMinutes / 60);
          milageArray.push(milageTimeInUnits);
          //if 209kms passed before 8 hours
          if (milageTimeInUnits - startTimeInUnits < 8) {
            //calculate the buildup
            let timeWorkedBeforeMilage = rounded(
              milageTimeInUnits - startTimeInUnits
            );
            if (timeWorkedBeforeMilage < 0) {
              timeWorkedBeforeMilage += 24;
            }
            let milageBU = 8 - timeWorkedBeforeMilage;
            milageArray.push(timeWorkedBeforeMilage);
            milageArray.push(milageBU);
            //calculate the OT
            let milageOT = rounded(workedUnits - timeWorkedBeforeMilage);
            milageArray.push(milageOT);
          } else {
            let timeWorkedBeforeMilage = rounded(
              milageTimeInUnits - startTimeInUnits
            );
            milageArray.push(timeWorkedBeforeMilage);
            milageArray.push("209kms passed after 8 hours");
          }
          x.push(milageArray);
        } else {
          x.push("No milage");
        }
      }

      timeAsUnits.push(x);
    }
  });

  return timeAsUnits;
};

//pay
// function pay(hours, day, daysWorked) {
//   if (daysWorked <= ordinaryDays) {
//     if (hours < 8) {
//       //hours * payRate
//     }
//     if (hours > 8) {
//       // 8 * payRate
//       if (day !== "Saturday" && day !== "Sunday" && !publicHoliday) {
//         //hours - 8 * payRate * 1.5
//       }
//       if (day === "Saturday" || day === "Sunday" || publicHoliday) {
//         //hours - 8 * payRate * 2
//       }
//     }
//   }
//   if (daysWorked > ordinaryDays) {
//     if (daysWorked <= ordinaryDays + 2) {
//       if (hours <= 11) {
//         //hours * payRate * 1.5
//       }
//       if (hours > 11) {
//         //8 * payRate * 1.5
//         //hours - 8 * payRate * 2
//       }
//     }
//     if (daysWorked >= ordinaryDays + 3) {
//       //hours * payRate * 2
//     }
//   }
// }

// function weekDayAllowances(hours, day, startTime, finishTime, daysWorked) {
//   if (day !== "Sunday" && day !== "Saturday") {
//     if (!publicHoliday && !callOut) {
//       MorningPenalty(hours, startTime);
//       AfternoonPenalty(hours, startTime, finishTime);
//       NightPenalty(hours, startTime, finishTime);
//       SpecialLoadingPenalty(startTime, finishTime);
//     }
//     if (callOut) {
//       CallOut(hours, day);
//     }
//   }
//   if (day === "Saturday") {
//     //sat loading 50%
//   }
//   if (day === "Sunday") {
//     //sun loading 100%
//   }
//   if (publicHoliday) {
//     //50% weekday and saturday
//     //100% sunday
//   }
// }
// //weekday shift allowances
// function MorningPenalty(hours, startTime) {
//   if (Math.round(hours) >= 8) {
//     hours = 8;
//   }
//   if (startTime >= 4 && startTime <= 5.5) {
//     dailyPayArray.push(Math.round(hours) * EarlyMorningShiftPenalty);
//     payDiv.innerText += ` Morning Shift Dvrs/Grds Hrl: ......................................................................................\n`;
//     unitDiv.innerText += `${Math.round(
//       hours
//     )}: .................................................................................................................\n`;
//     amountDiv.innerText += `${Math.round(hours) * EarlyMorningShiftPenalty}\n`;
//   }
// }

// function AfternoonPenalty(hours, startTime, finishTime) {
//   if (Math.round(hours) >= 8) {
//     hours = 8;
//   }
//   if (startTime < 18 && finishTime > 18) {
//     dailyPayArray.push(Math.round(hours) * AfternoonShiftPenalty);
//     payDiv.innerText += `Afternoon Shift Dvrs/Grds Hrl: ......................................................................................\n`;
//     unitDiv.innerText += `${Math.round(
//       hours
//     )}: .................................................................................................................\n`;
//     amountDiv.innerText += `${Math.round(hours) * AfternoonShiftPenalty}\n`;
//   }
// }

// function NightPenalty(hours, startTime) {
//   if (Math.round(hours) >= 8) {
//     hours = 8;
//   }
//   if (startTime <= 3.98 || startTime >= 18) {
//       dailyPayArray.push(Math.round(hours) * nightShiftPenalty);
//       payDiv.innerText += `Night Shift Dvrs/Grds Hrl: ......................................................................................\n`;
//       unitDiv.innerText += `${Math.round(
//         hours
//       )}: .................................................................................................................\n`;
//       amountDiv.innerText += `${Math.round(hours) * nightShiftPenalty}\n`;
// }

// function SpecialLoadingPenalty(startTime, finishTime) {
//   if (
//     (startTime >= 1.02 && startTime <= 3.98) ||
//     (finishTime >= 1.02 && finishTime <= 3.98)
//   ) {
//     dailyPayArray.push(specialLoading);
//     payDiv.innerText += `Special Loading Drvs/Grds: ......................................................................................\n`;
//     unitDiv.innerText += `1: .............................................................................................................\n`;
//     amountDiv.innerText += `${specialLoading}\n`;
//   }
// }
// //weekend loadings
// //public holiday loading
// //call out penalty
// function CallOut(hours, day) {
//   if (hours > 8) {
//     hours = 8;
//   }
//   if (callOut && day !== "Saturday" && day !== "Sunday") {
//     dailyPayArray.push(rounded(hours * payRate * callOutPenalty));
//     payDiv.innerText += ` Callout @ 25%: ............................................................................................ \n`;
//     unitDiv.innerText += ` ${hours}: .............................................................................................................................\n`;
//     amountDiv.innerText += `${rounded(hours * payRate * callOutPenalty)} \n`;
//   }
// }
//cab
//security

// //weekday pay
// function weekdayPay(hours,accruePh, payPh,callOut) {
//   if (accruePh || payPh) {
//     publicHoliday = true;
//   } else {
//     publicHoliday = false;
//   }
//   //ph
//   if(publicHoliday){
//     //ordinary 100%
//     //hours * payRate
//     //loading @ 50%
//     //hours * payRate * 0.5
//     //no shift penalties
//   }
//   //non ph
//   if(!publicHoliday){
//     //ordinary 100%
//     //hours * payRate
//     //shift penalties
//     //hours * penaltyRate
//     //special loading
//     //1 * specialLoading
//   }
//   //overtime
//   if(hours > 8){
//     //150%
//     //(hours - 8) * payRate * 1.5
//   }
//   //callout
//   if(callOut){
//     //125% upto 8 hours
//     //hours * payRate
//     //no shift penalties or spc loading
//   }
// }
// //saturday pay
// if (accruePh || payPh) {
//   publicHoliday = true;
// } else {
//   publicHoliday = false;
// }
//     //ph
//       //ordinary 100%
//       //PH loading @ 50%
//       //sat loading @ 50%
//     //non ph
//       //ordinary 100%
//       //sat loading @ 50%
//     // OT
//       //200%
// //sunday pay
// if (accruePh || payPh) {
//   publicHoliday = true;
// } else {
//   publicHoliday = false;
// }
//     //ph
//       //ordinary 100%
//       //PH loading @ 100%
//     //non ph
//       //ordinary 100%
//       //sun loading @ 100%
//     // OT
//       //200%
// //excess shifts
// if (accruePh || payPh) {
//   publicHoliday = true;
// } else {
//   publicHoliday = false;
// }
//     //day 1 + 2
//       //weekday
//         //150% up to 11 hours
//         //200% over 11 hours
//       //weekday PH
//         //150% normal
//         //50% PH loading
//       //weekend
//         //200%
//     //day 3 +
//       //200%
