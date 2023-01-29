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
    rowArray.push(table[i].value);
  }

  calculatePay(payRate, adoWeek, tableArray, role);
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
  var shortFall;
  // var dailyHours = 0;
  // var dailyMinutes = 0;
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
  var milage = 0;
  var extraKm = 0;
  var extraKmAsUnits = 0;
  var offsetUnits = 0;
  //displaying information to user
  var payDiv = document.getElementById("payDetails");
  //empty any existing text
  payDiv.innerText = "";
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

  //CALCULATING DAILY HOURS
  for (let i = 0; i < timeAsUnits.length; i++) {
    if (timeAsUnits[i].length > 0) {
      //adding all the working time;
      payDiv.innerText += `\n${weekdays[i]}: \n`;
      dailyPayArray = [];
      daysWorkedCounter++;
      dailyUnits += timeAsUnits[i][4];
      payPh = tableArray[i][7];
      accruePh = tableArray[i][8];
      security = tableArray[i][4];
      cab = tableArray[i][5];
      overtime = tableArray[i][9];
      callOut = tableArray[i][10];
      if (daysWorkedCounter <= ordinaryDays) {
        ordinaryUnits += dailyUnits;
        console.log('normal hours: ' + ordinaryUnits + ' - ' + dailyUnits);
      }

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
            console.log('BU: ' + ordinaryUnits + ' - ' + BU);
          }
        }
        //liftup
        if (timeAsUnits[i][7] !== "no lift up") {
          //lift up as units
          LU = timeAsUnits[i][7];
          offsetUnits += LU;
          if (daysWorkedCounter <= ordinaryDays) {
            ordinaryUnits += LU;
            console.log('LU: ' + ordinaryUnits + ' - ' + LU);
          }
        }
        //layback
        if (timeAsUnits[i][8] !== "no layback") {
          //layback as units
          LB = timeAsUnits[i][8];
          offsetUnits += LB;
          if (daysWorkedCounter <= ordinaryDays) {
            ordinaryUnits += LB;
            console.log('LB: ' + ordinaryUnits + ' - ' + LB);
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

      // TO DO'S:

      // REFINE CALLOUT
      // only mon to friday first 8 hours. or in addition to weekday PH penalty.
      // not for excess shifts, weekends, or on OT > 8 hours.

      // CHECK EXTRA KM's AND EFFECT ON PH's.

      // ADD MILAGE

      // EXCESS SHIFTS THAT ARE MORE THAN 11 HOURS IS 200%. NEED TO WRITE THAT IN. IS POSSIBLE FOR DRIVERS.

      //if not sick...
      if (timeAsUnits[i].length > 5) {
        // EXCESS SHIFT DOES NOT CURRENTLY ACCOUNT FOR OVERTIME OFFSETS LIKE BUILDUP, LAYBACK, LIFT UP, EXTRA KMs, MILAGE etc
        //excess shifts: overtime 150 on weekdays and 200 on weekends
        if (daysWorkedCounter > ordinaryDays) {
          //if its 1st or 2nd excess shift mon-fri, or a public holiday that isnt a saturday its 150%
          if (daysWorkedCounter <= ordinaryDays + 2) {
            if (weekdays[i] !== "Saturday") {
              dailyPayArray.push(
                (dailyUnits + BU + LU + LB + extraKmAsUnits) *
                  payRate *
                  weekdayOT
              );
              payDiv.innerText += ` Overtime @ 150%:  ${
                dailyUnits + BU + LU + LB + extraKmAsUnits
              }: ${
                (dailyUnits + BU + LU + LB + extraKmAsUnits) *
                payRate *
                weekdayOT
              }   \n`;
            }
            if (weekdays[i] === "Saturday") {
              dailyPayArray.push(
                (dailyUnits + BU + LU + LB + extraKmAsUnits) *
                  payRate *
                  weekendOT
              );
              payDiv.innerText += ` Overtime @ 200%:  ${
                (dailyUnits + BU + LU + LB + extraKmAsUnits) *
                payRate *
                weekendOT
              }   \n`;
            }
            // public holiday loading
            if (publicHoliday && weekdays[i] !== "Saturday") {
              // weekday PH is 50%
              dailyPayArray.push(Math.round(dailyUnits));
              payDiv.innerText += ` PH Loading @ 50%:  ${Math.round(
                dailyUnits
              )}: ${Math.round(dailyUnits) * payRate * satLoading}   \n`;
              // add minutes rounded up or down
            }
          }
          //if its 3rd excess day or more, or weekend, its 200%
          if (daysWorkedCounter > ordinaryDays + 2) {
            dailyPayArray.push(
              (dailyUnits + BU + LU + LB + extraKmAsUnits) * payRate * weekendOT
            );
            payDiv.innerText += ` Overtime @ 200%:  ${
              dailyUnits + BU + LU + LB
            }: ${
              (dailyUnits + BU + LU + LB + extraKmAsUnits) * payRate * weekendOT
            }   \n`;
          }
        }
        //calculating first 9/10 days ordinary hours
        if (daysWorkedCounter <= ordinaryDays) {
          //if shifts are over 8 hours
          if (dailyUnits + BU + LU + LB + extraKmAsUnits > shiftLength) {
            //add 8 hours to normal pay
            dailyPayArray.push(rounded(shiftLength * payRate));
            //print the details
            payDiv.innerText += ` Ordinary Hours:  ${shiftLength}: ${rounded(
              shiftLength * payRate
            )}   \n`;
            //anything worked over 8 is scheduled OT,
            //weekend or PH is 200%
            if (
              weekdays[i] === "Saturday" ||
              weekdays[i] === "Sunday" ||
              publicHoliday
            ) {
              dailyPayArray.push(
                rounded(
                  dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength
                ) *
                  payRate *
                  weekendOT
              );
              //CALCULATE ORDINARY TIME
              //@200% its equal in 1:1 ratio
              if (daysWorkedCounter <= ordinaryDays) {
                ordinaryUnits +=
                  dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength;
                  console.log('OT@200%: ' + ordinaryUnits + ' - ' + (dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength));
              }

              //print the details
              payDiv.innerText += ` Sched OT 200%:  ${rounded(
                dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength
              )}: ${rounded(
                (dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength) *
                  payRate *
                  weekendOT
              )}   \n`;
            } //weekday is 150%;
            else {
              dailyPayArray.push(
                rounded(
                  dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength
                ) *
                  payRate *
                  weekdayOT
              );
              //CALCULATE ORDINARY TIME
              //@150% its half the OT time
              if (daysWorkedCounter <= ordinaryDays) {
                ordinaryUnits +=
                  (dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength) /
                  2;
                  console.log('OT@100%: ' + ordinaryUnits + ' - ' + ((dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength) /
                  2))
              }

              //print the details
              payDiv.innerText += ` Sched OT 150%:  ${rounded(
                dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength
              )}: ${rounded(
                (dailyUnits + BU + LU + LB + extraKmAsUnits - shiftLength) *
                  payRate *
                  weekdayOT
              )}   \n`;

              // call out?
              if (callOut) {
                dailyPayArray.push(
                  rounded(shiftLength * payRate * callOutPenalty)
                );
                payDiv.innerText += ` Callout @ 25%:  ${shiftLength}: ${rounded(
                  shiftLength * payRate * callOutPenalty
                )}   \n`;
              }
            }
          } // if shift is 8 hours or under calculate normal pay
          if (dailyUnits + BU + LU + LB + extraKmAsUnits <= shiftLength) {
            dailyPayArray.push(
              rounded((dailyUnits + BU + LU + LB + extraKmAsUnits) * payRate)
            );
            //print the details
            payDiv.innerText += ` Ordinary Hours:  ${
              dailyUnits + BU + LU + LB + extraKmAsUnits
            }: ${rounded(
              (dailyUnits + BU + LU + LB + extraKmAsUnits) * payRate
            )}   \n`;

            if (callOut && weekdays !== "Saturday" && weekdays !== "Sunday") {
              dailyPayArray.push(
                rounded(
                  (dailyUnits + BU + LU + LB + extraKmAsUnits) *
                    payRate *
                    callOutPenalty
                )
              );
              payDiv.innerText += ` Callout @ 25%:  ${
                dailyUnits + BU + LU + LB + extraKmAsUnits
              }: ${rounded(
                (dailyUnits + BU + LU + LB + extraKmAsUnits) *
                  payRate *
                  callOutPenalty
              )}   \n`;
            }
          }

          //LOADINGS BASED ON WORKING HOURS.
          //NEED TO REFACTOR TO ROUND UP OR DOWN THE MINUTES FOR AN EXTRA UNIT OF PAY - 30 MINUTES IS DOWN
          // saturday loading
          if (weekdays[i] === "Saturday" && !publicHoliday) {
            if (Math.round(dailyUnits) < 8) {
              dailyPayArray.push(Math.round(dailyUnits) * payRate * satLoading);
              payDiv.innerText += ` Loading @ 50% Saturday:  ${Math.round(
                dailyUnits
              )}: ${Math.round(dailyUnits) * payRate * satLoading}   \n`;
            } else {
              dailyPayArray.push(shiftLength * payRate * satLoading);
              payDiv.innerText += ` Loading @ 50% Saturday:  ${shiftLength}: ${
                shiftLength * payRate * satLoading
              }   \n`;
            }
          }
          // sunday loading
          if (weekdays[i] === "Sunday" && !publicHoliday) {
            if (Math.round(dailyUnits) < 8) {
              dailyPayArray.push(Math.round(dailyUnits) * payRate * sunLoading);
              payDiv.innerText += ` Loading @ 100% Sunday:  ${Math.round(
                dailyUnits
              )}: ${Math.round(dailyUnits) * payRate * sunLoading}   \n`;
            } else {
              dailyPayArray.push(shiftLength * payRate * sunLoading);
              payDiv.innerText += ` Loading @ 100% Sunday:  ${shiftLength}: ${
                shiftLength * payRate * sunLoading
              }   \n`;
            }
          }
          // public holiday loading
          if (publicHoliday) {
            // weekend PH is 100%
            if (weekdays[i] === "Sunday" || weekdays[i] === "Saturday") {
              if (Math.round(dailyUnits) < 8) {
                dailyPayArray.push(
                  Math.round(dailyUnits) * payRate * sunLoading
                );
                payDiv.innerText += ` PH Loading @ 100%:  ${Math.round(
                  dailyUnits
                )}: ${Math.round(dailyUnits) * payRate * sunLoading}   \n`;
              } else {
                dailyPayArray.push(shiftLength * payRate * sunLoading);
                payDiv.innerText += ` PH Loading @ 100%:  ${shiftLength}: ${
                  shiftLength * payRate * sunLoading
                }   \n`;
              }
            } else {
              if (Math.round(dailyUnits) < 8) {
                // weekday PH is 50%
                dailyPayArray.push(
                  Math.round(dailyUnits) * payRate * satLoading
                );
                payDiv.innerText += ` PH Loading @ 50%:  ${Math.round(
                  dailyUnits
                )}: ${Math.round(dailyUnits) * payRate * satLoading}   \n`;
              } else {
                dailyPayArray.push(shiftLength * payRate * satLoading);
                payDiv.innerText += ` PH Loading @ 50%:  ${shiftLength}: ${
                  shiftLength * payRate * satLoading
                }   \n`;
              }
            }
          }
          //SHIFT ALLOWANCE PENALTIES - ONLY ON WEEKDAYS
          if (
            weekdays[i] !== "Sunday" &&
            weekdays[i] !== "Saturday" &&
            !publicHoliday
          ) {
            if (tableArray[i][1] >= 400 && tableArray[i][1] <= 530) {
              console.log("its morning shift!");
              if (Math.round(dailyUnits) >= 8) {
                dailyPayArray.push(shiftLength * EarlyMorningShiftPenalty);
                payDiv.innerText += ` Morning Shift Dvrs/Grds Hrl:  ${shiftLength}: ${
                  shiftLength * EarlyMorningShiftPenalty
                }   \n`;
              } else {
                dailyPayArray.push(
                  Math.round(dailyUnits) * EarlyMorningShiftPenalty
                );
                payDiv.innerText += ` Morning Shift Dvrs/Grds Hrl:  ${Math.round(
                  dailyUnits
                )}: ${Math.round(dailyUnits) * EarlyMorningShiftPenalty}   \n`;
              }
            }
            if (tableArray[i][1] < 1800 && tableArray[i][3] > 1800) {
              console.log("its arvo shift!");
              if (Math.round(dailyUnits) >= 8) {
                dailyPayArray.push(shiftLength * AfternoonShiftPenalty);
                payDiv.innerText += ` Afternoon Shift Dvrs/Grds Hrl:  ${shiftLength}: ${
                  shiftLength * AfternoonShiftPenalty
                }   \n`;
              } else {
                dailyPayArray.push(
                  Math.round(dailyUnits) * AfternoonShiftPenalty
                );
                payDiv.innerText += ` Afternoon Shift Dvrs/Grds Hrl:  ${Math.round(
                  dailyUnits
                )}: ${Math.round(dailyUnits) * AfternoonShiftPenalty}   \n`;
              }
            }
            if (tableArray[i][1] <= 359 || tableArray[i][1] >= 1800) {
              if (Math.round(dailyUnits) >= 8) {
                dailyPayArray.push(Math.round(dailyUnits) * nightShiftPenalty);
                payDiv.innerText += ` Night Shift Dvrs/Grds Hrl:  ${Math.round(
                  dailyUnits
                )}: ${Math.round(dailyUnits) * nightShiftPenalty}   \n`;
              } else {
                dailyPayArray.push(shiftLength * nightShiftPenalty);
                payDiv.innerText += ` Night Shift Dvrs/Grds Hrl:  ${shiftLength}: ${
                  shiftLength * nightShiftPenalty
                }   \n`;
              }
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
        if (security) {
          dailyPayArray.push(securityAllowance);
          payDiv.innerText += ` Guards Security Allow:  1: ${securityAllowance}   \n`;
        }
        //add cab if ticked - single unit per shift
        if (cab) {
          dailyPayArray.push(cabEtrAllowance);
          payDiv.innerText += ` Elec Guards Spl Shift All:  1: ${cabEtrAllowance}   \n`;
        }
        //add public holiday paid if ticked and accrue is not ticked
        //CHECK IF THIS IS 8 HOURS REGARDLESS OR ACTUAL WORKING HOURS
        if (publicHoliday && !accruePh) {
          dailyPayArray.push(rounded(shiftLength * payRate));
          payDiv.innerText += ` Public Holiday Paid:  ${shiftLength}: ${rounded(
            shiftLength * payRate
          )}   \n`;
        }
        // accrue public holiday, doesnt get paid.
        if (accruePh) {
          console.log(
            "public holiday accrued up to 8 a year + 1 non proclaimed PH aka picnic day"
          );
          payDiv.innerText += ` Public Holiday Accrued  \n`;
        }
        //print working time and running total
        console.log(
          daysWorkedCounter +
            `: daily Units: ` +
            (dailyUnits + BU + LU + LB) +
            `||  total Units: ` +
            ordinaryUnits
        );
      } else {
        //SICK
        //GET PAID 8 HOURS
        //ADD THE ROSTERED HOURS TO THE SHORTFALL
        //WHAT HAPPENS TO PUBLIC HOLIDAY IF SICK??????
        timeLost += timeAsUnits[i][4];
        sickDays++;
        ordinaryUnits -= dailyUnits;
        console.log(`sick day - lost ${dailyUnits} of ordinary Time`);
        dailyPayArray.push(rounded(shiftLength * payRate));
        payDiv.innerText += `Sick: ${shiftLength}: ${rounded(
          shiftLength * payRate
        )}\n`;
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
  // if (daysWorkedCounter >= ordinaryDays) {
    if (ordinaryUnits + offsetUnits >= baseHours - timeLost) {
      console.log(
        `worked hours: ${
          ordinaryUnits + offsetUnits
        }.  Base hours: ${baseHours} - Time Lost: ${timeLost} = ${
          baseHours - timeLost
        }  Guarantee payment: None!`
      );
      payArray.push(0);
    } else {
      console.log(
        `worked hours: ${
          ordinaryUnits + offsetUnits
        }.  Base hours: ${baseHours} - Time Lost: ${timeLost} = ${
          baseHours - timeLost
        }.  Guarantee payment: ${rounded(
          (baseHours - timeLost - ordinaryUnits - offsetUnits) * payRate
        )} for ${
          baseHours - timeLost - ordinaryUnits - offsetUnits
        } hours shortfall!`
      );
      payArray.push(
        rounded((baseHours - timeLost - ordinaryUnits - offsetUnits) * payRate)
      );
      payDiv.innerText += ` \nGuarantee: ${
        baseHours - timeLost - ordinaryUnits - offsetUnits
      }: ${rounded(
        (baseHours - timeLost - ordinaryUnits - offsetUnits) * payRate
      )}   \n`;
    }
  // }

  console.log(wobodArray);
  //Guards Wobod
  //add wobods to an array and array.shift() if there is a sick day;
  //sick days keep the callouts but loses the wobod
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
        payDiv.innerText += ` \nNEXT FORTNIGHT WOBOD PAYMENT: ${
          wobodShift[0]
        } - ${rounded(wobodShift[1] * payRate * WOBOD)}   \n`;
      }
      // with callout - wobod = 23%
      else {
        console.log(
          `wobod payment next fortnite at 23% of ${
            wobodShift[0]
          }'s shift: ${rounded(wobodShift[1] * payRate * 0.23)}`
        );
        payDiv.innerText += ` \nNEXT FORTNIGHT WOBOD PAYMENT: ${
          wobodShift[0]
        } - ${rounded(wobodShift[1] * payRate * 0.23)}   \n`;
      }
    });
  }

  //drivers OT bonus
  if (role === "Driver") {
    if (OTdays - sickDays > 0 && OTdays - sickDays < 4) {
      for (let i = 0; i < bonusOtShifts.length; i++) {
        if (OTdays === bonusOtShifts[i]) {
          console.log(
            `Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
              OTdays - sickDays
            }. OT Bonus = ${bonusOtRates[i]}`
          );
          payDiv.innerText += ` \n Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
            OTdays - sickDays
          }. OT Bonus = ${bonusOtRates[i]}  \n`;
        }
      }
    } else if (OTdays - sickDays >= 4) {
      console.log(
        `Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
          OTdays - sickDays
        }. OT Bonus = ${bonusOtRates[2]}`
      );
      payDiv.innerText += ` \n Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
        OTdays - sickDays
      }. OT Bonus = ${bonusOtRates[2]}  \n`;
    } else {
      console.log(
        `Overtime Days: ${OTdays} - Days Sick: ${sickDays} = ${
          OTdays - sickDays
        }. OT Bonus = $0.00`
      );
    }
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
    //if day is empty, push an empty array
    if (row[0] === "") {
      timeAsUnits.push(rowTime);
    } else {
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

      //if the day is not a sick day
      if (row[3] !== null && row[1].toUpperCase() !== "SICK") {
        //finish time actual as units
        let finishTime = row[3].match(/.{2}/g);
        let finishTimeInMinutes =
          parseInt(finishTime[0]) * 60 + parseInt(finishTime[1]);
        finishTimeInUnits = rounded(finishTimeInMinutes / 60);
        x.push(finishTimeInUnits);
      } else {
        x.push("Sick");
      }

      //sick - calculate time lost
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
          // x.push(weekdays[index]);
        } else {
          x.push([workedUnits, weekdays[index]]);
          // x.push(weekdays[index]);
        }

        // WORK TIME ON FINISH DAY
        //if finish time is less than start time
        //that means its a late shift that finishes the next morning
        if (finishTimeRosteredInUnits < startTimeRosteredInUnits) {
          x.push([
            Math.abs(startTimeInUnits + workedUnits - 24),
            weekdays[index + 1],
          ]);
          // x.push(weekdays[index + 1]);
        } else {
          x.push(weekdays[index]);
        }

        //LU
        // start time is before rostered, finish time is before rostered
        if (startTimeInUnits < startTimeRosteredInUnits) {
          // finish time is before rostered finish time and rostered finish time is < midnight
          if (finishTimeInUnits < finishTimeRosteredInUnits) {
            x.push(Math.abs(finishTimeRosteredInUnits - finishTimeInUnits));
          }
          if (
            finishTimeInUnits > finishTimeRosteredInUnits &&
            finishTimeRosteredInUnits < startTimeRosteredInUnits
          ) {
            // if finish time is greater than rostered finish time means it finished same day but rostered finish next day
            // add 24 to finishTimeRosteredInUnits
            x.push(
              Math.abs(finishTimeRosteredInUnits + 24 - finishTimeInUnits)
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
          x.push(startTimeInUnits - startTimeRosteredInUnits);
        } else {
          x.push(`no layback`);
        }

        //BU
        let bu = 0;
        let workedUnitsRostered = 0;
        if (finishTimeRosteredInUnits < startTimeRosteredInUnits) {
          workedUnitsRostered = Math.abs(
            startTimeRosteredInUnits - (finishTimeRosteredInUnits + 24)
          );
        } else {
          workedUnitsRostered =
            finishTimeRosteredInUnits - startTimeRosteredInUnits;
        }
        //if the actual work time is less than the rostered work time then there is build up
        if (workedUnits < workedUnitsRostered) {
          //if start time > rostered
          if (startTimeInUnits > startTimeRosteredInUnits) {
            //if finish time <= rostered eg 2200 - 2130 & 0200 0130
            if (finishTimeInUnits <= finishTimeRosteredInUnits) {
              bu =
                startTimeInUnits -
                startTimeRosteredInUnits +
                (finishTimeRosteredInUnits - finishTimeInUnits);
              x.push(bu);
              // console.log(index + " a");
            }
            //if finish time rostered < start time && finish time > rostered finish eg . 0000 2330
            if (
              finishTimeRosteredInUnits < startTimeRosteredInUnits &&
              finishTimeInUnits > finishTimeRosteredInUnits
            ) {
              bu =
                startTimeInUnits -
                startTimeRosteredInUnits +
                (finishTimeRosteredInUnits + 24 - finishTimeInUnits);
              x.push(bu);
              // console.log(index + " b");
            }
          }
          //if start time = rostered
          else if (startTimeInUnits === startTimeRosteredInUnits) {
            //if finish time < rostered eg 2200 - 2130 & 0200 0130
            if (finishTimeInUnits < finishTimeRosteredInUnits) {
              bu = finishTimeRosteredInUnits - finishTimeInUnits;
              x.push(bu);
              // console.log(index + " c");
            }
            //if finish time rostered < start time && finish time < rostered finish eg . 0000 2330
            if (
              finishTimeRosteredInUnits < startTimeInUnits &&
              finishTimeInUnits > finishTimeRosteredInUnits
            ) {
              bu = finishTimeRosteredInUnits + 24 - finishTimeInUnits;
              x.push(bu);
              // console.log(index + " d");
            }
          } else {
            x.push(`no buildup`);
          }
        } else {
          x.push(`no buildup`);
        }
      }

      timeAsUnits.push(x);
    }
  });

  return timeAsUnits;
};
