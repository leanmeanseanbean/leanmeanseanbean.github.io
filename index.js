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

calculatePay = (payRate, adoWeek, tableArray, role) => {
  const WOBOD = 0.48;
  const securityAllowance = 5.75;
  const cabEtrAllowance = 7.4;
  const nightShiftPenalty = 4.89;
  const EarlyMorningShiftPenalty = 4.15;
  const AfternoonShiftPenalty = 4.15;
  const callOutPenalty = 0.25;
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
  //displaying information to user
  var payDiv = document.getElementById("payDetails");
  var unitDiv = document.getElementById("unitDetails");
  var amountDiv = document.getElementById("amountDetails");
  //empty any existing text
  payDiv.innerText = "";
  unitDiv.innerText = ``;
  amountDiv.innerText = ``;
  for (let i = 0; i < 14; i++) {
    document.getElementsByClassName("displayHours")[i].value = ``;
  }

  //calculate hours and minutes worked
  timeAsUnits = calculateTimeWorkedAsUnits(tableArray);
  console.log(tableArray);
  console.log(timeAsUnits);
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

  // TO DO'S:

  // SHIFTS THAT START ONE DAY AND FINISH THE NEXT
  // seperate calculations based on timeWorkedAsUnits starting and finishing days

  // CHECK EXTRA KM's AND EFFECT ON PH's.
  payDiv.innerText += ` \n Details \n`;
  unitDiv.innerText += ` \nUnits\n`;
  amountDiv.innerText += ` \nAmounts\n`;
  //CALCULATING DAILY HOURS
  for (let i = 0; i < timeAsUnits.length; i++) {
    // IF ITS NOT A DAY OFF
    if (timeAsUnits[i].length > 0) {
      //adding all the working time;
      payDiv.innerText += ` \n${weekdays[i]}: \n`;
      unitDiv.innerText += ` \n\n`;
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
        shiftDay = timeAsUnits[i][5][1];

        if (
          //IF THERE IS MILAGE ADD THE TIMES
          timeAsUnits[i][10] !== "No milage" &&
          timeAsUnits[i][1] !== "Sick"
        ) {
          milageUnits = timeAsUnits[i][10][1];
          milageBU = timeAsUnits[i][10][2];
          milageOTUnits = timeAsUnits[i][10][3];
          offsetUnits += milageOTUnits;
        } // IF THE DAY THE SHIFT STARTS AND FINISHES ARENT THE SAME, MULTI DAY SHIFT
        if (timeAsUnits[i][5][1] !== timeAsUnits[i][6][1]) {
          shiftStartUnits = timeAsUnits[i][5][0];
          shiftFinishUnits = timeAsUnits[i][6][0];
          singleDay = false;
        } // CALCULATE ORDINARY TIME FOR 9/10 DAYS IN FORTNIGHT
        if (daysWorkedCounter <= ordinaryDays) {
          ordinaryUnits += dailyUnits;
          console.log("normal hours: " + ordinaryUnits + " - " + dailyUnits);
        }
      }
      console.log(singleDay);

      if (accruePh || payPh) {
        publicHoliday = true;
      } else {
        publicHoliday = false;
      }

      //display time worked in the timesheet
      if (timeAsUnits[i].length > 5)
        document.getElementsByClassName("displayHours")[
          i
        ].value = `${Math.trunc(dailyUnits)}'${Math.round(
          (dailyUnits - Math.trunc(dailyUnits)) * 60
        )}"`;

      //add offset times for ordinary hours
      if (timeAsUnits[i].length > 5) {
        //buildup
        if (timeAsUnits[i][9] !== "no buildup") {
          //build up as units
          BU = timeAsUnits[i][9];
          offsetUnits += BU;
          if (daysWorkedCounter <= ordinaryDays) {
            ordinaryUnits += BU;
            console.log("BU: " + ordinaryUnits + " - " + BU);
          }
        }
        //liftup
        if (timeAsUnits[i][7] !== "no lift up") {
          //lift up as units
          LU = timeAsUnits[i][7];
          offsetUnits += LU;
          if (daysWorkedCounter <= ordinaryDays) {
            ordinaryUnits += LU;
            console.log("LU: " + ordinaryUnits + " - " + LU);
          }
        }
        //layback
        if (timeAsUnits[i][8] !== "no layback") {
          //layback as units
          LB = timeAsUnits[i][8];
          offsetUnits += LB;
          if (daysWorkedCounter <= ordinaryDays) {
            ordinaryUnits += LB;
            console.log("LB: " + ordinaryUnits + " - " + LB);
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
            // public holiday loading 50% - applicable on weekdays only
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
        //calculating first 9/10 days ordinary hours
        if (daysWorkedCounter <= ordinaryDays) {
          //singleDay
          // if (singleDay) {
          //CHANGE THIS BACK TO SINGLEDAY WHEN ITS FIXED
          if (true) {
            //IF THERE IS NO MILAGE
            if (timeAsUnits[i][10] === "No milage") {
              //if shifts are over 8 hours
              if (dailyUnits + BU + LU + LB + extraKmAsUnits > shiftLength) {
                shiftWithOT(dailyUnits + BU + LU + LB + extraKmAsUnits);
              }
              // if shift is 8 hours or under calculate normal pay
              if (dailyUnits + BU + LU + LB + extraKmAsUnits <= shiftLength) {
                shiftWithoutOT(dailyUnits + BU + LU + LB + extraKmAsUnits);
              }
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
                  //milage eg 7'30"
                  dailyPayArray.push(rounded(shiftLength * payRate));
                  //milage payment @ 150%
                  dailyPayArray.push(
                    rounded(milageOTUnits * payRate * weekdayOT)
                  );
                  payDiv.innerText += ` Ordinary Hours: ............................................................................................\n`;
                  unitDiv.innerText += ` ${shiftLength}: ................................................................................................................................... \n`;
                  amountDiv.innerText += ` ${rounded(
                    shiftLength * payRate
                  )} \n`;
                  payDiv.innerText += `  Milage payment 209k's:  ..................................................................................\n`;
                  unitDiv.innerText += `  ${milageOTUnits}: ................................................................................................................................... \n`;
                  amountDiv.innerText += ` ${rounded(
                    milageOTUnits * payRate * weekdayOT
                  )}  \n`;
                  //excess is 150% on weekdays eg - 30" + any LU LB BU etc
                  if (BU + LU + LB + extraKmAsUnits > 0) {
                    dailyPayArray.push(
                      rounded(
                        (BU + LU + LB + extraKmAsUnits) * payRate * weekdayOT
                      )
                    );
                    payDiv.innerText += `  Sched OT 150%:   ..................................................................................\n`;
                    unitDiv.innerText += `   ${rounded(
                      BU + LU + LB + extraKmAsUnits
                    )}: ................................................................................................................................... \n`;
                    amountDiv.innerText += `${rounded(
                      (BU + LU + LB + extraKmAsUnits) * payRate * weekdayOT
                    )}   \n`;
                  }
                }
                // saturday or weekday ph - 150% to 8 hours, over 8 OT is 200%
                if (
                  weekdays[i] === "Saturday" ||
                  (weekdays[i] !== "Sunday" &&
                    weekdays[i] !== "Saturday" &&
                    publicHoliday)
                ) {
                  //milage eg 7'30"
                  dailyPayArray.push(rounded(shiftLength * payRate));
                  //excess is 150%  up to 8 hours as eg - 30" + any LU LB BU etc
                  dailyPayArray.push(
                    rounded(milageOTUnits * payRate * weekdayOT)
                  );
                  // ADD A LOADING FOR SATURDAY OR PUBLIC HOLIDAY
                  payDiv.innerText += `Ordinary Hours:  ..................................................................................\n`;
                  unitDiv.innerText += `  ${shiftLength}: ................................................................................................................................... \n`;
                  amountDiv.innerText += ` ${rounded(shiftLength * payRate)}\n`;
                  payDiv.innerText += ` Milage payment 209k's: ..................................................................................\n`;
                  unitDiv.innerText += ` ${milageOTUnits}: ................................................................................................................................... \n`;
                  amountDiv.innerText += `${rounded(
                    milageOTUnits * payRate * weekdayOT
                  )}\n`;

                  // excess over 8 hours is 200%
                  if (BU + LU + LB + extraKmAsUnits > 0) {
                    dailyPayArray.push(
                      rounded(
                        (BU + LU + LB + extraKmAsUnits) * payRate * weekendOT
                      )
                    );
                    payDiv.innerText += ` Sched OT 200%: .........................................................................................\n`;
                    unitDiv.innerText += `${rounded(
                      BU + LU + LB + extraKmAsUnits
                    )}: ................................................................................................................................\n`;
                    amountDiv.innerText += `${rounded(
                      (BU + LU + LB + extraKmAsUnits) * payRate * weekendOT
                    )}\n`;
                  }
                }
                // sat PH = 200% max, sunday = 200% max
                if (
                  weekdays[i] === "Sunday" ||
                  (weekdays[i] === "Saturday" && publicHoliday)
                ) {
                  //milage eg 7'30"
                  dailyPayArray.push(rounded(shiftLength * payRate));
                  // excess is 200%
                  dailyPayArray.push(
                    rounded(
                      (milageOTUnits + BU + LU + LB + extraKmAsUnits) *
                        payRate *
                        weekendOT
                    )
                  );

                  payDiv.innerText += ` Ordinary Hours: ....................................................................................................\n`;
                  unitDiv.innerText += `  ${shiftLength}: ...........................................................................................................................\n`;
                  amountDiv.innerText += ` ${rounded(shiftLength * payRate)}\n`;

                  payDiv.innerText += ` Sched OT 200%: ......................................................................................\n`;
                  unitDiv.innerText += `${rounded(
                    milageOTUnits + BU + LU + LB + extraKmAsUnits
                  )}: ..........................................................................................................................\n`;
                  amountDiv.innerText += `${rounded(
                    (milageOTUnits + BU + LU + LB + extraKmAsUnits) *
                      payRate *
                      weekendOT
                  )}\n`;
                }
              }
              if (milageUnits >= 8) {
                // weekday non ph, all OT is 150%
                if (
                  weekdays[i] !== "Saturday" &&
                  weekdays[i] !== "Sunday" &&
                  !publicHoliday
                ) {
                  //milage eg 7'30"
                  dailyPayArray.push(rounded(shiftLength * payRate));
                  //excess is 150% on weekdays eg - 30" + any LU LB BU etc
                  dailyPayArray.push(
                    rounded(
                      (dailyUnits -
                        shiftLength +
                        BU +
                        LU +
                        LB +
                        extraKmAsUnits) *
                        payRate *
                        weekdayOT
                    )
                  );
                  payDiv.innerText += ` Ordinary Hours: ....................................................................................................\n`;
                  unitDiv.innerText += `  ${shiftLength}: .............................................................................................................\n`;
                  amountDiv.innerText += ` ${rounded(shiftLength * payRate)}\n`;
                  payDiv.innerText += ` Sched OT 150%: ......................................................................................\n`;
                  unitDiv.innerText += `${rounded(
                    dailyUnits - shiftLength + BU + LU + LB + extraKmAsUnits
                  )}: ...........................................................................................................................\n`;
                  amountDiv.innerText += `${rounded(
                    (dailyUnits - shiftLength + BU + LU + LB + extraKmAsUnits) *
                      payRate *
                      weekdayOT
                  )}\n`;
                }
                // saturday or weekday ph - 150% to 8 hours, over 8 OT is 200%
                if (
                  weekdays[i] === "Saturday" ||
                  (weekdays[i] !== "Sunday" &&
                    weekdays[i] !== "Saturday" &&
                    publicHoliday)
                ) {
                  //milage eg 7'30"
                  dailyPayArray.push(rounded(shiftLength * payRate));
                  // excess over 8 hours is 200%
                  dailyPayArray.push(
                    rounded(
                      (dailyUnits -
                        shiftLength +
                        BU +
                        LU +
                        LB +
                        extraKmAsUnits) *
                        payRate *
                        weekendOT
                    )
                  );
                  // ADD A LOADING FOR SATURDAY OR PUBLIC HOLIDAY
                  payDiv.innerText += ` Ordinary Hours: ......................................................................................\n`;
                  unitDiv.innerText += `  ${shiftLength}: .............................................................................................................\n`;
                  amountDiv.innerText += ` ${rounded(shiftLength * payRate)}\n`;

                  payDiv.innerText += ` Sched OT 200%: ......................................................................................\n`;
                  unitDiv.innerText += `${rounded(
                    dailyUnits - shiftLength + BU + LU + LB + extraKmAsUnits
                  )}: ...........................................................................................................................\n`;
                  amountDiv.innerText += `${rounded(
                    (dailyUnits - shiftLength + BU + LU + LB + extraKmAsUnits) *
                      payRate *
                      weekendOT
                  )}\n`;
                }
                // sat PH = 200% max, sunday = 200% max
                if (
                  weekdays[i] === "Sunday" ||
                  (weekdays[i] === "Saturday" && publicHoliday)
                ) {
                  //milage eg 7'30"
                  dailyPayArray.push(rounded(shiftLength * payRate));
                  // excess is 200%
                  dailyPayArray.push(
                    rounded(
                      (dailyUnits -
                        shiftLength +
                        BU +
                        LU +
                        LB +
                        extraKmAsUnits) *
                        payRate *
                        weekendOT
                    )
                  );

                  payDiv.innerText += ` Ordinary Hours: ......................................................................................\n`;
                  unitDiv.innerText += `  ${shiftLength}: .............................................................................................................\n`;
                  amountDiv.innerText += ` ${rounded(shiftLength * payRate)}\n`;

                  payDiv.innerText += ` Sched OT 200%: ......................................................................................\n`;
                  unitDiv.innerText += `${rounded(
                    dailyUnits - shiftLength + BU + LU + LB + extraKmAsUnits
                  )}: ...........................................................................................................................\n`;
                  amountDiv.innerText += `${rounded(
                    (dailyUnits - shiftLength + BU + LU + LB + extraKmAsUnits) *
                      payRate *
                      weekendOT
                  )}\n`;
                }
              }
              if (
                callOut &&
                weekdays[i] !== "Saturday" &&
                weekdays[i] !== "Sunday"
              ) {
                dailyPayArray.push(
                  rounded(
                    (dailyUnits + BU + LU + LB + extraKmAsUnits) *
                      payRate *
                      callOutPenalty
                  )
                );
                payDiv.innerText += ` Callout @ 25%: ......................................................................................\n`;
                unitDiv.innerText += `${rounded(
                  dailyUnits + BU + LU + LB + extraKmAsUnits
                )}: ...........................................................................................................................\n`;
                amountDiv.innerText += `${rounded(
                  (dailyUnits + BU + LU + LB + extraKmAsUnits) *
                    payRate *
                    callOutPenalty
                )}\n`;
              }
            }
            //LOADINGS BASED ON ACTUAL HOURS WORKED
            //NEED TO REFACTOR TO ROUND UP OR DOWN THE MINUTES FOR AN EXTRA UNIT OF PAY - 30 MINUTES IS DOWN
            // saturday loading
            if (weekdays[i] === "Saturday" && !publicHoliday) {
              if (Math.round(dailyUnits) < 8) {
                saturdayLoading(dailyUnits);
              } else {
                saturdayLoading(shiftLength);
              }
            }
            // sunday loading
            if (weekdays[i] === "Sunday" && !publicHoliday) {
              if (Math.round(dailyUnits) < 8) {
                sundayLoading(dailyUnits);
              } else {
                sundayLoading(shiftLength);
              }
            }
            // public holiday loading
            if (publicHoliday) {
              // weekend PH is 100%
              if (weekdays[i] === "Sunday" || weekdays[i] === "Saturday") {
                if (Math.round(dailyUnits) < 8) {
                  PHsunday(dailyUnits);
                } else {
                  PHsunday(shiftLength);
                }
              } else {
                if (Math.round(dailyUnits) < 8) {
                  // weekday PH is 50%
                  PHweekday(dailyUnits);
                } else {
                  PHweekday(shiftLength);
                }
              }
            }
            //SHIFT ALLOWANCE PENALTIES - ONLY ON WEEKDAYS
            if (
              weekdays[i] !== "Sunday" &&
              weekdays[i] !== "Saturday" &&
              !publicHoliday &&
              !callOut
            ) {
              morningPenalty();
              afternoonPenalty();
              nightPenalty();
              specialLoadingPenalty();
            }
          }
          // if(!singleDay) {
          //   shiftStartUnits = timeAsUnits[i][5][0];
          //   shiftFinishUnits = timeAsUnits[i][6][0];
          //   let shiftStartDay = timeAsUnits[i][5][1];
          //   let shiftFinishDay = timeAsUnits[i][6][1];
          //   let total = dailyUnits + BU + LB + LU + extraKmAsUnits + milageBU;

          //   //ordinary hours
          //   //OT?
          //   //callout?
          //   //Penalties/loading
          //   //shift allowances
          //   //sec
          //   //cab
          //   //ph paid

          //   //fri to sat
          //   if(weekdays[i] === "Friday"){
          //     //ordinary hours
          //     if(timeAsUnits[i][10] === "No milage"){
          //       //shifts greater than 8
          //       if(total > shiftLength){
          //         dailyPayArray.push(dailyUnits * payRate)

          //       }
          //       if(total <= shiftLength){

          //       }
          //     }
          //     if(timeAsUnits[i][10] !== "No milage"){

          //     }
          //   //OT?
          //   //callout?
          //   //Penalties/loading
          //   //shift allowances
          //   //sec
          //   //cab
          //   //ph paid
          //     //PH to PH
          //     //PH to non PH
          //     //non PH to PH
          //   }
          //   //sat to sun
          //   if(weekdays[i] === "Saturday"){
          //     //PH to PH
          //     //PH to non PH
          //     //non PH to PH
          //   }
          //   //sun to mon
          //   if(weekdays[i] === "Sunday"){

          //     //PH to PH
          //     //PH to non PH
          //     //non PH to PH
          //   }
          // }
        }
        //add security if ticked - single unit per shift
        securityAllownace();
        //add cab if ticked - single unit per shift
        cabAllowance();
        //add public holiday paid if ticked and accrue is not ticked
        //CHECK IF THIS IS 8 HOURS REGARDLESS OR ACTUAL WORKING HOURS
        PHWorkAccrue();
        //print working time and running total
        console.log(
          daysWorkedCounter +
            `: daily Units: ` +
            rounded(dailyUnits + BU + LU + LB) +
            `||  total Units: ` +
            rounded(ordinaryUnits)
        );
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
        wobodArray.push([weekdays[i], dailyUnits]);
      }

      //reset daily counters
      dailyUnits = 0;
      BU = 0;
      LU = 0;
      LB = 0;
      milageBU = 0;
      milageOTUnits = 0;
      singleDay = true;

      payArray.push(dailyPayArray);
      dailyPayArray = [];
    }
    // IF IT IS A DAY OFF
    else {
      dailyPayArray = [];
      console.log("day off");
      payDiv.innerText += ` \n${weekdays[i]}:  DAY OFF\n`;
      unitDiv.innerText += ` \n\n`;
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
  OTBonus();

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
  console.log(GrossPay);
  payDiv.innerText += ` \n Gross Pay:\n`;
  unitDiv.innerText += ` \n\n`;
  amountDiv.innerText += ` \n  ${rounded(GrossPay)}   \n`;

  function morningPenalty() {
    if (startTimeActual >= 4 && startTimeActual <= 5.5) {
      console.log("its morning shift!");
      if (Math.round(dailyUnits) >= 8) {
        dailyPayArray.push(shiftLength * EarlyMorningShiftPenalty);
        payDiv.innerText += ` Morning Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${shiftLength}: ...................................................................................................\n`;
        amountDiv.innerText += `${shiftLength * EarlyMorningShiftPenalty}\n`;
      } else {
        dailyPayArray.push(Math.round(dailyUnits) * EarlyMorningShiftPenalty);
        payDiv.innerText += ` Morning Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${Math.round(
          dailyUnits
        )}: .................................................................................................................\n`;
        amountDiv.innerText += `${
          Math.round(dailyUnits) * EarlyMorningShiftPenalty
        }\n`;
      }
    }
  }

  function afternoonPenalty() {
    if (startTimeActual < 18 && finishTimeActual > 18) {
      console.log("its arvo shift!");
      if (Math.round(dailyUnits) >= 8) {
        dailyPayArray.push(shiftLength * AfternoonShiftPenalty);
        payDiv.innerText += `Afternoon Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${shiftLength}: .................................................................................................................\n`;
        amountDiv.innerText += `${shiftLength * AfternoonShiftPenalty}\n`;
      } else {
        dailyPayArray.push(Math.round(dailyUnits) * AfternoonShiftPenalty);
        payDiv.innerText += `Afternoon Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${Math.round(
          dailyUnits
        )}: .................................................................................................................\n`;
        amountDiv.innerText += `${
          Math.round(dailyUnits) * AfternoonShiftPenalty
        }\n`;
      }
    }
  }

  function nightPenalty() {
    if (startTimeActual <= 3.98 || startTimeActual >= 18) {
      if (Math.round(dailyUnits) < 8) {
        dailyPayArray.push(Math.round(dailyUnits) * nightShiftPenalty);
        payDiv.innerText += `Night Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${Math.round(
          dailyUnits
        )}: .................................................................................................................\n`;
        amountDiv.innerText += `${
          Math.round(dailyUnits) * nightShiftPenalty
        }\n`;
      } else {
        dailyPayArray.push(shiftLength * nightShiftPenalty);
        payDiv.innerText += `Night Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${shiftLength}: .................................................................................................................\n`;
        amountDiv.innerText += `${shiftLength * nightShiftPenalty}\n`;
      }
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
      amountDiv.innerText += `${specialLoading}\n`;
    }
  }

  function payWOBOD() {
    if (overtime && role === "Guard") {
      for (let i = 0; i < sickDays; i++) {
        wobodArray.shift();
      }
      //no callout - wobod = 48%
      wobodArray.forEach((wobodShift) => {
        if (!callOut) {
          console.log(
            `wobod payment next fortnite at 48% of ${
              wobodShift[0]
            }'s shift: ${rounded(wobodShift[1] * payRate * WOBOD)}`
          );
          payDiv.innerText += `\nNEXT FORTNIGHT WOBOD PAYMENT: ...............................................................................................................................\n`;
          unitDiv.innerText += ` \n@${wobodShift[0]}......................................................................................................................................................\n`;
          amountDiv.innerText += ` \n${rounded(
            wobodShift[1] * payRate * WOBOD
          )}\n`;
        }
        // with callout - wobod = 23%
        else {
          console.log(
            `wobod payment next fortnite at 23% of ${
              wobodShift[0]
            }'s shift: ${rounded(wobodShift[1] * payRate * 0.23)}`
          );
          payDiv.innerText += `NEXT FORTNIGHT WOBOD PAYMENT: ...............................................................................................................................\n`;
          unitDiv.innerText += ` \n@${wobodShift[0]}......................................................................................................................................................\n`;
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
            console.log(
              `Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
                OTdays - sickDays
              }. OT Bonus = ${bonusOtRates[i]}`
            );
            payDiv.innerText += `Overtime Days: ${OTdays} - Days Sick: ${sickDays} =...............................................................................................................................\n`;
            unitDiv.innerText += ` \n${
              OTdays - sickDays
            }......................................................................................................................................................\n`;
            amountDiv.innerText += ` \n${bonusOtRates[i]}\n`;
          }
        }
      } else if (OTdays - sickDays >= 4) {
        console.log(
          `Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
            OTdays - sickDays
          }. OT Bonus = ${bonusOtRates[2]}`
        );
        payDiv.innerText += `Overtime Days: ${OTdays} - Days Sick: ${sickDays} =...............................................................................................................................\n`;
        unitDiv.innerText += ` \n${
          OTdays - sickDays
        }......................................................................................................................................................\n`;
        amountDiv.innerText += ` \n${bonusOtRates[2]}\n`;
      } else {
        console.log(
          `Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
            OTdays - sickDays
          }. OT Bonus = $0.00`
        );
      }
    }
  }

  function guaranteePayment() {
    if (ordinaryUnits + offsetUnits >= baseHours - timeLost) {
      //shortfall is the units
      console.log(
        `worked hours: ${
          ordinaryUnits + offsetUnits
        }.  Base hours: ${baseHours} - Time Lost: ${timeLost} = ${
          baseHours - timeLost
        }  Guarantee payment: None!`
      );
      payArray.push(0);
    } else {
      shortFall = baseHours - timeLost - ordinaryUnits - offsetUnits;
      console.log(
        `worked hours: ${
          ordinaryUnits + offsetUnits
        }.  Base hours: ${baseHours} - Time Lost: ${timeLost} = ${
          baseHours - timeLost
        }.  Guarantee payment: ${rounded(
          shortFall * payRate
        )} for ${shortFall} hours shortfall!`
      );
      payArray.push(rounded(shortFall * payRate));
      payDiv.innerText += ` \nGuarantee: ...............................................................................................................................\n`;
      unitDiv.innerText += ` \n${shortFall}: ......................................................................................................................................................\n`;
      amountDiv.innerText += ` \n${rounded(shortFall * payRate)}\n`;
    }
  }

  function adjustADO() {
    if (adoWeek === "long") {
      payArray.push(rounded(adoAdjustment * -1));
      payDiv.innerText += ` \nADO Adjustment: .............................................................................................................................................\n`;
      unitDiv.innerText += ` \n-4: ....................................................................................................................................................................\n`;
      amountDiv.innerText += ` \n${rounded(adoAdjustment * -1)}\n`;
    } else {
      payArray.push(rounded(adoAdjustment));
      payDiv.innerText += ` \nADO Adjustment: ...............................................................................................................................\n`;
      unitDiv.innerText += ` \n4: ......................................................................................................................................................\n`;
      amountDiv.innerText += ` \n${rounded(adoAdjustment)}\n`;
    }
  }

  function PHWorkAccrue() {
    // payout public holiday
    if (publicHoliday && !accruePh) {
      dailyPayArray.push(rounded(shiftLength * payRate));
      payDiv.innerText += `Public Holiday Paid: ......................................................................................\n`;
      unitDiv.innerText += `${shiftLength}: .........................................................................................................................................\n`;
      amountDiv.innerText += `${rounded(shiftLength * payRate)}\n`;
    }
    // accrue public holiday, doesnt get paid.
    if (accruePh) {
      console.log(
        "public holiday accrued up to 8 a year + 1 non proclaimed PH aka picnic day"
      );
      payDiv.innerText += ` Public Holiday Accrued  \n`;
    }
  }

  function HOLpayment() {
    console.log(`HOL - public holiday not required`);
    dailyPayArray.push(rounded(shiftLength * payRate));

    payDiv.innerText += `HOL: ............................................................................................................................................................\n`;
    unitDiv.innerText += `${shiftLength}: .......................................................................................................................................................\n`;
    amountDiv.innerText += `${rounded(shiftLength * payRate)}\n`;
  }

  function sickDay() {

      timeLost += dailyUnits;
      sickDays++;
      console.log(`sick day - lost ${dailyUnits} of ordinary Time`);
      dailyPayArray.push(rounded(shiftLength * payRate));

      payDiv.innerText += `Sick: ..............................................................................................................................................\n`;
      unitDiv.innerText += `${shiftLength}: .........................................................................................................................................\n`;
      amountDiv.innerText += `${rounded(shiftLength * payRate)}\n`;
    
  }

  function cabAllowance() {
    if (cab) {
      dailyPayArray.push(cabEtrAllowance);
      payDiv.innerText += `Elec Guards Spl Shift All: ......................................................................................\n`;
      unitDiv.innerText += `1: ...........................................................................................................................\n`;
      amountDiv.innerText += `${cabEtrAllowance}\n`;
    }
  }

  function securityAllownace() {
    if (security) {
      dailyPayArray.push(securityAllowance);
      payDiv.innerText += `Guards Security Allow: ......................................................................................\n`;
      unitDiv.innerText += `1: ...........................................................................................................................\n`;
      amountDiv.innerText += `${securityAllowance}\n`;
    }
  }

  function PHweekday(hours) {
    dailyPayArray.push(rounded(hours * payRate * satLoading));

    payDiv.innerText += ` PH Loading @ 50%: ......................................................................................\n`;
    unitDiv.innerText += `${Math.round(
      hours
    )}: .................................................................................................................\n`;
    amountDiv.innerText += `${rounded(
      Math.round(hours) * payRate * satLoading
    )}\n`;
  }

  function PHsunday(hours) {
    dailyPayArray.push(rounded(hours * payRate * sunLoading));
    payDiv.innerText += ` PH Loading @ 100%: ......................................................................................\n`;
    unitDiv.innerText += `${hours}: .................................................................................................................\n`;
    amountDiv.innerText += `${rounded(hours * payRate * sunLoading)}\n`;
  }

  function saturdayLoading(hours) {
    dailyPayArray.push(rounded(Math.round(hours) * payRate * satLoading));
    payDiv.innerText += ` Loading @ 50% Saturday: ......................................................................................\n`;
    unitDiv.innerText += `${Math.round(
      hours
    )}: ...........................................................................................................................\n`;
    amountDiv.innerText += `${rounded(
      Math.round(hours) * payRate * satLoading
    )}\n`;
  }

  function sundayLoading(hours) {
    dailyPayArray.push(rounded(Math.round(hours) * payRate * sunLoading));

    payDiv.innerText += ` Loading @ 100% Sunday: ......................................................................................\n`;
    unitDiv.innerText += `${Math.round(
      hours
    )}: .................................................................................................................\n`;
    amountDiv.innerText += `${rounded(
      Math.round(hours) * payRate * sunLoading
    )}\n`;
  }

  function excessWeekday(hours) {
    if (hours < 11) {
      dailyPayArray.push(rounded(hours * payRate * weekdayOT));

      payDiv.innerText += ` Overtime @ 150%: ........................................................................................ \n`;
      unitDiv.innerText += ` ${rounded(
        hours
      )}: ........................................................................................................................\n`;
      amountDiv.innerText += ` ${rounded(hours * payRate * weekdayOT)}\n`;
    }
    if (hours > 11) {
      //up to 11 hours is 150%
      dailyPayArray.push(rounded(11 * payRate * weekdayOT));

      payDiv.innerText += ` Overtime @ 150%: ................................................................................................  \n`;
      unitDiv.innerText += ` ${rounded(
        11
      )}: ...................................................................................................................................... \n`;
      amountDiv.innerText += ` ${rounded(11 * payRate * weekdayOT)}   \n`;
      // over 11 hours is 200%
      dailyPayArray.push(rounded((hours - 11) * payRate * weekendOT));

      payDiv.innerText += ` Overtime @ 200%: .................................................................................................  \n`;
      unitDiv.innerText += ` ${rounded(
        hours - 11
      )}: ...................................................................................................................................... \n`;
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
    amountDiv.innerText += `${rounded(hours * payRate * weekendOT)}  \n`;
  }

  function milageBuildUp(milageBU) {
    dailyPayArray.push(rounded(milageBU * payRate));
    payDiv.innerText += `209km passed at ${tableArray[i][6]} - Buildup: ...............................................................................................................  \n`;
    unitDiv.innerText += `  ${rounded(
      milageBU
    )}: .................................................................................................................................................... \n`;
    amountDiv.innerText += `${rounded(milageBU * payRate)}   \n`;
  }

  function ApplyCallOut(hours) {
    if (hours > shiftLength) {
      hours = shiftLength;
    }
    dailyPayArray.push(rounded(hours * payRate * callOutPenalty));
    payDiv.innerText += ` Callout @ 25%: ............................................................................................ \n`;
    unitDiv.innerText += ` ${hours}: .............................................................................................................................\n`;
    amountDiv.innerText += `${rounded(hours * payRate * callOutPenalty)} \n`;
  }

  function shiftWithOT(hours) {
    //8 hours to normal pay
    dailyPayArray.push(rounded(shiftLength * payRate));
    payDiv.innerText += ` Ordinary Hours: ....................................................................................................\n`;
    unitDiv.innerText += ` ${shiftLength}: ...........................................................................................................................\n`;
    amountDiv.innerText += ` ${rounded(shiftLength * payRate)}  \n`;

    //anything worked over 8 is scheduled OT,
    //weekend or PH is 200%
    if (shiftDay === "Saturday" || shiftDay === "Sunday" || publicHoliday) {
      dailyPayArray.push(rounded(hours - shiftLength) * payRate * weekendOT);
      //print the details
      payDiv.innerText += ` Sched OT 200%: ............................................................................................ \n`;
      unitDiv.innerText += ` ${rounded(
        hours - shiftLength
      )}: ...........................................................................................................................................\n`;
      amountDiv.innerText += ` ${rounded(
        (hours - shiftLength) * payRate * weekendOT
      )}  \n`;

      //CALCULATE ORDINARY TIME
      //@200% its equal in 1:1 ratio
      if (daysWorkedCounter <= ordinaryDays) {
        ordinaryUnits += rounded(
          dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength
        );
        console.log(
          "OT@200%: " +
            rounded(ordinaryUnits) +
            " - " +
            rounded(dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength)
        );
      }
    }
    //weekday is 150%;
    if (shiftDay !== "Saturday" && shiftDay !== "Sunday" && !publicHoliday) {
      dailyPayArray.push(rounded(hours - shiftLength) * payRate * weekdayOT);

      //print the details
      payDiv.innerText += ` Sched OT 150%: ............................................................................................ \n`;
      unitDiv.innerText += ` ${rounded(
        hours - shiftLength
      )}: .............................................................................................................................\n`;
      amountDiv.innerText += `${rounded(
        (hours - shiftLength) * payRate * weekdayOT
      )} \n`;
      //CALCULATE ORDINARY TIME
      //@150% its half the OT time
      if (daysWorkedCounter <= ordinaryDays) {
        ordinaryUnits += rounded(
          (dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength) / 2
        );
        console.log(
          "OT@100%: " +
            rounded(ordinaryUnits) +
            " - " +
            rounded(
              (dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength) / 2
            )
        );
      }
    }
    // call out on weekdays and non PH only
    if (callOut && shiftDay !== "Saturday" && shiftDay !== "Sunday") {
      ApplyCallOut(shiftLength);
    }
  }

  function shiftWithoutOT(hours) {
    dailyPayArray.push(rounded(hours * payRate));
    //print the details
    payDiv.innerText += ` Ordinary Hours: ................................................................................................\n`;
    unitDiv.innerText += `${rounded(
      hours
    )}: ................................................................................................................................................. \n`;
    amountDiv.innerText += ` ${rounded(hours * payRate)}  \n`;

    if (callOut && shiftDay !== "Saturday" && shiftDay !== "Sunday") {
      ApplyCallOut(hours);
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
      var workedUnits;
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

        let workedUnitsRostered = 0;
        if (finishTimeRosteredInUnits < startTimeRosteredInUnits) {
          workedUnitsRostered = Math.abs(
            startTimeRosteredInUnits - (finishTimeRosteredInUnits + 24)
          );
        } else {
          workedUnitsRostered =
            finishTimeRosteredInUnits - startTimeRosteredInUnits;
        }

        //LU
        // start time is before rostered, finish time is before rostered
        if (
          startTimeInUnits < startTimeRosteredInUnits &&
          workedUnitsRostered === workedUnits
        ) {
          // finish time is before rostered finish time and rostered finish time is < midnight
          if (finishTimeInUnits < finishTimeRosteredInUnits) {
            x.push(
              rounded(Math.abs(finishTimeRosteredInUnits - finishTimeInUnits))
            );
          }
          if (
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
          }
        } else {
          x.push(`no lift up`);
        }
        //LB
        if (
          startTimeInUnits > startTimeRosteredInUnits &&
          finishTimeInUnits >=
            finishTimeRosteredInUnits +
              (startTimeInUnits - startTimeRosteredInUnits)
        ) {
          x.push(rounded(startTimeInUnits - startTimeRosteredInUnits));
        } else {
          x.push(`no layback`);
        }

        //BU
        let bu = 0;
        //if the actual work time is less than the rostered work time then there is build up
        if (workedUnits < workedUnitsRostered) {
          //if start time > rostered
          if (startTimeInUnits > startTimeRosteredInUnits) {
            //if finish time <= rostered eg 2200 - 2130 & 0200 0130
            if (finishTimeInUnits <= finishTimeRosteredInUnits) {
              bu = rounded(
                startTimeInUnits -
                  startTimeRosteredInUnits +
                  (finishTimeRosteredInUnits - finishTimeInUnits)
              );
              x.push(bu);
              // console.log(index + " a");
            }
            //if finish time rostered < start time && finish time > rostered finish eg . 0000 2330
            if (
              finishTimeRosteredInUnits < startTimeRosteredInUnits &&
              finishTimeInUnits > finishTimeRosteredInUnits
            ) {
              bu = rounded(
                startTimeInUnits -
                  startTimeRosteredInUnits +
                  (finishTimeRosteredInUnits + 24 - finishTimeInUnits)
              );
              x.push(bu);
              // console.log(index + " b");
            }
          }
          //if start time = rostered
          else if (startTimeInUnits === startTimeRosteredInUnits) {
            //if finish time < rostered eg 2200 - 2130 & 0200 0130
            if (finishTimeInUnits < finishTimeRosteredInUnits) {
              bu = rounded(finishTimeRosteredInUnits - finishTimeInUnits);
              x.push(bu);
              // console.log(index + " c");
            }
            //if finish time rostered < start time && finish time < rostered finish eg . 0000 2330
            if (
              finishTimeRosteredInUnits < startTimeInUnits &&
              finishTimeInUnits > finishTimeRosteredInUnits
            ) {
              bu = rounded(finishTimeRosteredInUnits + 24 - finishTimeInUnits);
              x.push(bu);
              // console.log(index + " d");
            }
          } else {
            x.push(`no buildup`);
          }
        } else {
          x.push(`no buildup`);
        }

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
