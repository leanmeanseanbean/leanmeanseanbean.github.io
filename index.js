var payDiv = document.getElementById("payDetails");
var unitDiv = document.getElementById("unitDetails");
var rateDiv = document.getElementById("rateDetails");
var amountDiv = document.getElementById("amountDetails");
var earlyMorningShiftPenalty = 4.47;
var afternoonShiftPenalty = 4.46;
var nightShiftPenalty = 5.26;
var specialLoading = 5.26;

storeData = () => {
    const payrate = document.getElementById("payRate").value ? document.getElementById("payRate").value : alert("insert payrate");
    const longOrShort = document.querySelector("input[name=longOrShort]:checked") ? document.querySelector("input[name=longOrShort]:checked").value : alert('pick long or short');
    var longFortnight = true;    
    if(longOrShort == "short") {
        longFortnight = false;
    }

    const table = document.getElementById("timesheet");
    const rows = table.querySelectorAll(".payRow");

    var rowObj = {};
    const tableObj = {};
    var days = ['sun','mon', 'tues', 'wed', 'thur', 'fri', 'sat','sun','mon', 'tues', 'wed', 'thur', 'fri', 'sat'];

    tableObj.longFortnight = longFortnight;
    tableObj.payrate = payrate;
    var excessCounter = 0;

    //for each row in the table we need to calculate
    rows.forEach((row,i) => {
        // console.log(row);
        //find the inputs for the day
        const dataInputs = row.querySelectorAll("input");
        // console.log(dataInputs);
        //for each input for each row
        for (let y = 0; y < dataInputs.length; y++) {
            if(dataInputs[y].value.trim().toLowerCase() == "hol"){
                rowObj["hol"] = true;
                rowObj[5] = true;
                break;
            }
            //if its a checkbox and is checked ie. PH, accrue PH, OT or callout
            if(dataInputs[y].type == "checkbox" && dataInputs[y].checked){
                rowObj[`${y}`] = true;    
            }//if its a checkbox and is NOT checked ie. PH, accrue PH, OT or callout
            else if (dataInputs[y].type == "checkbox" && !dataInputs[y].checked){
                rowObj[`${y}`] = false;  
            }//if rostered sign on is empty
            else if(dataInputs[y].id.includes("RosteredSignOn") && dataInputs[y].value.trim().toLocaleLowerCase() !== "sick" && dataInputs[y].value.trim() == ""){
                rowObj["RDO"] = true;
                rowObj[5] = dataInputs[5].checked;
                rowObj[6] = dataInputs[6].checked;
                break;
            }//if rostered sign on says SICK
            else if(dataInputs[y].id.includes("ActualSignOn") && dataInputs[y].value.trim().toLocaleLowerCase() == "sick"){
                rowObj["sick"] = true;
                rowObj[`${y+1}`] = dataInputs[y+1].value.trim();
                rowObj[5] = dataInputs[5].checked;
                rowObj[6] = dataInputs[6].checked;
                break;
            }
            else { //otherwise just add the value
                rowObj[`${y}`] = dataInputs[y].value.trim();
            }
        }
        rowObj.day = days[i];
        
        if(!rowObj.sick && !rowObj.RDO){
            excessCounter++;
        }

        if(excessCounter > 10 && tableObj.longFortnight || excessCounter > 9 && !tableObj.longFortnight){
            rowObj.excessDayNormal = true;
        }
        if(excessCounter > 12 && tableObj.longFortnight || excessCounter > 11 && !tableObj.longFortnight){
            rowObj.excessDayDouble = true;
        }

        tableObj[`${i}`] = rowObj;
        // console.log(rowObj);
        rowObj = {};
    })

    convertInputs(tableObj);
}


function convertInputs(tableObj) {
    const payObj = {};
    payObj.longFortnight = tableObj.longFortnight;
    payObj.payrate = parseFloat(tableObj.payrate);
    payObj.ordinaryUnits = 0;
    payObj.timeLost = 0;

    for (let i = 0; i < 14; i++) {
        let rowObj = {};
        rowObj['day'] = tableObj[i]['day'];
        if(!!tableObj[i].excessDayNormal){
            rowObj['excessDayNormal'] = true;
        }
        if(!!tableObj[i].excessDayDouble){
            rowObj['excessDayDouble'] = true;
        }
        if(!!tableObj[i].RDO){ //IF ITS AN RDO
            rowObj['RDO'] = true;
            if(tableObj[i][5] == true){ //add in PH or accrued PH only if its a PH
                rowObj['PH'] = tableObj[i][5];
                rowObj['accruePH'] = tableObj[i][6];
            }
            payObj[i] = rowObj;
            rowObj = {};
            continue;
        }
        if(!!tableObj[i].sick){ //IF ITS A SICK DAY
            rowObj['rosteredStart'] = changeToUnits(tableObj[i][0]);
            rowObj['rosteredFinish'] = changeToUnits(tableObj[i][2]);
            rowObj['sick'] = true;
            if(tableObj[i][5] == true){
                rowObj['PH'] = tableObj[i][5];
                rowObj['accruePH'] = tableObj[i][6];
            }

            payObj.timeLost += 8.00;
            payObj[i] = rowObj;
            rowObj = {};
            continue;
        }
        if(!!tableObj[i].hol){
            rowObj['hol'] =  true;
            if(tableObj[i][5] == true){ //add in PH or accrued PH only if its a PH
                rowObj['PH'] = true;
            }
            payObj[i] = rowObj;
            rowObj = {};
            continue;
        }
        else { //OTHERWISE ITS A WORKING DAY
            rowObj['rosteredStart'] = tableObj[i][0];
            rowObj['actualStart'] = tableObj[i][1];
            rowObj['rosteredFinish'] = tableObj[i][2];
            rowObj['actualFinish'] = tableObj[i][3];
            if(tableObj[i][4].trim() !== ""){
                rowObj['milage'] = tableObj[i][4];
            }
            if(tableObj[i][5] == true){
                rowObj['PH'] = tableObj[i][5];
                rowObj['accruePH'] = tableObj[i][6];
            }
            if(tableObj[i][7] == true){
                rowObj['OT'] = tableObj[i][7];
                rowObj['callout'] = tableObj[i][8];
            }
            if(tableObj[i][9].trim() !== ""){
                rowObj['extraKM'] = tableObj[i][9];
            }
            rowObj['timeWorked'] = tableObj[i][10];
            rowObj['timeWorkedInUnits'] = changeToUnits(rowObj['timeWorked']);

            // console.log(rowObj);

            // CHECKING THE TIME WORKED MATCHES THE ACTUAL START AND FINISH TIMES
            if(changeToMinutes(rowObj.actualFinish) > changeToMinutes(rowObj.actualStart)){ // if the shift starts and ends on the same day
                let shouldHaveWorked = changeToMinutes(rowObj.actualFinish) - changeToMinutes(rowObj.actualStart); // check the difference in start and finish times
                if(shouldHaveWorked !== changeToMinutes(rowObj.timeWorked)){ // it should match the time worked inputted
                    // console.log(shouldHaveWorked);
                    // console.log(changeToMinutes(rowObj.timeWorked));
                    console.log('error here');
                    alert('error. time worked isnt the same as the hours you put in'); // if not throw an error
                }
            }
            if(changeToMinutes(rowObj.actualFinish) < changeToMinutes(rowObj.actualStart)){ // if the shift finishes the next day
                let shouldHaveWorked = (changeToMinutes(rowObj.actualFinish) + changeToMinutes('2400')) - changeToMinutes(rowObj.actualStart); // add 24 hours to the finish time and then check the differences
                if(shouldHaveWorked !== changeToMinutes(rowObj.timeWorked)){ // it should match the time worked inputted
                    // console.log(shouldHaveWorked);
                    // console.log(changeToMinutes(rowObj.timeWorked));
                    // console.log(rowObj.day);
                    // console.log('and error here');
                    alert('error. time worked isnt the same as the hours you put in'); // if not throw an error
                }
                else{ 
                    rowObj['finishesNextDay'] = true;
                }
            }

            //CHECK IF ITS SUPPOSE TO FINISH THE NEXT DAY BY ROSTERED TIMES
            if(rowObj.rosteredFinish < rowObj.rosteredStart){
                rowObj['shouldFinishNextDay'] = true;
            }

            rowObj['totalWorked'] = parseFloat(rowObj['timeWorkedInUnits']);

            let isLiftedUp = LiftUp(rowObj);
            if(isLiftedUp){
                rowObj.liftUpAsMinutes = isLiftedUp;
                rowObj.liftUpAsUnits = minutesAsUnits(isLiftedUp);
                rowObj['totalWorked'] += parseFloat(rowObj.liftUpAsUnits);
            }

            let isLaidBack = Layback(rowObj);
            if(isLaidBack){
                rowObj.laybackAsMinutes = isLaidBack;
                rowObj.laybackAsUnits = minutesAsUnits(isLaidBack);
                rowObj['totalWorked'] += parseFloat(rowObj.laybackAsUnits);
            }

            let hasBuildUp = Buildup(rowObj);
            if(hasBuildUp){
                rowObj.buildupAsMinutes = hasBuildUp;
                rowObj.buildupAsUnits = minutesAsUnits(hasBuildUp);
                rowObj['totalWorked'] += parseFloat(rowObj.buildupAsUnits);
            }

            let hasExtraKM = ExtraKMAsUnits(rowObj);
            if(hasExtraKM){
                rowObj.extraKMAsUnits = hasExtraKM;
                rowObj['totalWorked'] += rowObj.extraKMAsUnits;
            }
            
            payObj.ordinaryUnits += rowObj.totalWorked;
            payObj[i] = rowObj;
            rowObj = {};
        }
    }

    CalculatePay(payObj);
    DisplayBreakdown(payObj);
    return payObj;
}

function CalculatePay(payObj) {
    console.log(payObj);
  //empty any existing text
  payDiv.innerText = "";
  unitDiv.innerText = ``;
  rateDiv.innerText = ``;
  amountDiv.innerText = ``;

  payDiv.innerText += ` \n Details \n`;
  unitDiv.innerText += ` \nUnits\n`;
  rateDiv.innerText += ` \nRate\n`;
  amountDiv.innerText += ` \nAmounts\n`;

  var grossPay = 0;

  for (let i = 0; i < 14; i++) { //for each day
    
    // console.log(payObj[i].day);
        //display if its a day off
    if(!!payObj[i].RDO){
        payDiv.innerText += ` \n${payObj[i].day}:  DAY OFF\n`;
        unitDiv.innerText += ` \n\n`;
        rateDiv.innerText += `\n\n`;
        amountDiv.innerText += ` \n\n`;
    }
    else {
        //display the day
        payDiv.innerText += ` \n${payObj[i].day}: \n`;
        unitDiv.innerText += ` \n\n`;
        rateDiv.innerText += `\n\n`;
        amountDiv.innerText += ` \n\n`;

        //display normal hours pay
        grossPay += NormalPay(payObj[i], payObj.payrate);
        // console.log('normal: ' + grossPay);
        grossPay += Overtime(payObj[i], payObj.payrate);
        // console.log('ot: ' + grossPay);
        grossPay += ExcessShift(payObj[i], payObj.payrate);
        grossPay += MorningShiftPenalty(payObj[i]);
        grossPay += AfternoonShiftPenalty(payObj[i]);
        grossPay += NightShiftPenalty(payObj[i]);
        grossPay += SpecialLoadingPenalty(payObj[i]);
        grossPay += SaturdayLoading(payObj[i], payObj.payrate);
        grossPay += SundayLoading(payObj[i], payObj.payrate);
        grossPay += Hol(payObj[i], payObj.payrate);
        grossPay += PublicHoliday(payObj[i], payObj.payrate);
        grossPay += PublicHolidayLoading(payObj[i], payObj.payrate);
        grossPay += CallOut(payObj[i], payObj.payrate);
        grossPay += SickDay(payObj[i], payObj.payrate);
        Wobod(payObj[i], payObj.payrate);
    }
  }

  grossPay += AdoAdjustment(payObj.longFortnight, payObj.payrate);
  payObj.ordinaryUnits += AdoAdjustmentForGuarantee(payObj.longFortnight);
  grossPay += GuaranteePayment(payObj);

  payDiv.innerText += ` \n Gross Pay:\n`;
  unitDiv.innerText += ` \n\n`;
  rateDiv.innerText += `\n\n`;
  amountDiv.innerText += ` \n  ${rounded(grossPay)}   \n`;
    
}

function LiftUp(rowObj){
    if(!rowObj.timeWorked){
        console.log('not a working day, so no lift up');
        return false;
    }
    // LIFT UP IS start time and finish time actual are before rostered
    let startsBefore = rowObj.actualStart < rowObj.rosteredStart;
    if(!startsBefore){
        console.log(rowObj.day)
        console.log('shift starts later than rostered, no lift up');
        return false;
    }
    let finishesBefore = rowObj.actualFinish < rowObj.rosteredFinish;
    
    //if it doesnt finish earlier + doesnt finish next day + isnt suppose to finish next day
    if(!finishesBefore && !rowObj.finishesNextDay && !rowObj.shouldFinishNextDay){ 
        console.log(rowObj.day)
        console.log('shift finishes later than rostered, no lift up');
        return false;
    }

    let liftUp = changeToMinutes(rowObj.rosteredFinish) - changeToMinutes(rowObj.actualFinish); //i.e actual 0200, rostered 0230 - lift up = 0.5
    
    //finishesBefore may be false. this may be due to a shift finishing the next day so check if its so
    if(!finishesBefore && !!rowObj.shouldFinishNextDay){ //if it does finish the next day
        // R0030 A2330
        liftUp = (changeToMinutes(rowObj.rosteredFinish) + changeToMinutes('2400')) - changeToMinutes(rowObj.actualFinish);
    }
    
    return liftUp;
}

function Layback(rowObj){
    if(!rowObj.timeWorked){
        console.log('not a working day, so no layback');
        return false;
    }
    // if actual start time > rostered start time && actual finish time > rostered finish time eg. 
    let startsAfter = rowObj.actualStart > rowObj.rosteredStart;
    if(!startsAfter){
        console.log('shift starts before rostered, no layback');
        return false;
    }
    let finishesAfter = rowObj.actualFinish > rowObj.rosteredFinish;
    //if it finishes earlier + doesnt finish next day
    if(!finishesAfter && !rowObj.finishesNextDay){ 
        console.log('shift finishes later than rostered, no layback');
        return false;
    }

    let layback = changeToMinutes(rowObj.actualStart) - changeToMinutes(rowObj.rosteredStart); //i.e actual 0300, rostered 0230 - layback = 0.5
    
    //finishesAfter may be false. this may be due to a shift finishing the next day so check if its so
    if(!finishesAfter && !!rowObj.finishesNextDay){ //if it does finish the next day
        // R2330 A0030
        layback = (changeToMinutes(rowObj.actualStart) + changeToMinutes('2400')) - changeToMinutes(rowObj.rosteredStart);
    }
    
    // console.log('layback : ' + layback);
    return layback;

}

function Buildup(rowObj){
    if(!rowObj.timeWorked){
        console.log('not a working day, so no buildup');
        return false;
    }

    //check if start time is equal to rostered
    //check if start time is later than rostered
    let startDiff = changeToMinutes(rowObj.actualStart) - changeToMinutes(rowObj.rosteredStart);
    
    //check if finish time is equal to rostered
    //check if finish time is less than rostered 
    let finishDiff = changeToMinutes(rowObj.rosteredFinish) - changeToMinutes(rowObj.actualFinish);
    
    //if shift is rostered to finish next day but doesnt then calculate the difference
    if(rowObj.shouldFinishNextDay && !rowObj.finishesNextDay){
        finishDiff = (changeToMinutes(rowObj.rosteredFinish) + changeToMinutes('2400')) - changeToMinutes(rowObj.actualFinish);
    }


    if(startDiff == 0 && finishDiff == 0 || startDiff < 0 || finishDiff < 0){
        console.log('no buildup');
        return false;
    }

    let buildup = startDiff + finishDiff;
    console.log(buildup);
    return buildup;
}

function NormalPay(rowObj, payRate){
    if(!rowObj.timeWorked){
        return 0;
    }
//shift length up to 8 hours * payRate
    let hours = rowObj.totalWorked;
    if (hours >= 8) {
        hours = 8;
    }

    if(!!rowObj.excessDayNormal || !!rowObj.excessDayDouble){
        return 0;
    }


    if (!!rowObj.PH) {
        payDiv.innerText += ` Public Holiday Worked: ....................................................................................................\n`;
    } else {
        payDiv.innerText += ` Ordinary Hours: ....................................................................................................\n`;
    }
    unitDiv.innerText += `  ${rounded(
        hours
    )}: ...........................................................................................................................\n`;
    rateDiv.innerText += `${payRate}...................................................................................................\n`;
    amountDiv.innerText += ` ${rounded(hours * payRate)}\n`;
    return parseFloat(rounded(hours * payRate));
    
}
    
function Overtime(rowObj, payRate){
    if(!rowObj.timeWorked){
        return 0;
    }

    if(!!rowObj.excessDayNormal || !!rowObj.excessDayDouble){
        return 0;
    }

    let hours = rowObj.totalWorked;
    
    if( hours <= 8){
        return 0;
    }
    if (hours > 8) {
        hours = parseFloat(rounded(hours - 8));
    }
    
    //mon-fri: normal shift over 8 hours is paid at 150%
    //if its a PH, overtime is paid at 200%;
    //print the details
    if(rowObj.day !== "sat" && rowObj.day !== "sun" && !rowObj.finishesNextDay){
        payDiv.innerText += ` Sched OT 150%: ............................................................................................ \n`;
        unitDiv.innerText += ` ${
            hours
        }: .............................................................................................................................\n`;
        rateDiv.innerText += `${payRate * 1.5}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(hours * payRate * 1.5)} \n`;

        return parseFloat(rounded(hours * payRate * 1.5));
    }

    //weekend: shift over 8 hours is paid at 200%;
    //saturday PH is 200% max.
    if(!rowObj.finishesNextDay && (rowObj.day == "sat" || rowObj.day == "sun")){
        payDiv.innerText += ` Sched OT 200%: ............................................................................................ \n`;
        unitDiv.innerText += ` ${rounded(
            hours
        )}: .............................................................................................................................\n`;
        rateDiv.innerText += `${payRate * 1}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(hours * payRate * 2)} \n`;

        return parseFloat(rounded(hours * payRate * 2));
    }

    //if the shift finishes the next day, find out what day it is and then add the appropriate overtime
    if(!!rowObj.finishesNextDay){
        //check what portion falls within the next day
        // actualFinish change to units
        let nextDayPortion = changeToUnits(rowObj.actualFinish);
        // check if the overtime hours is less than nextDayPortion
        if(hours < nextDayPortion){
            // if less, OT is wholely in next day
            if(rowObj.day == "fri" || rowObj.day == "sat"){
                payDiv.innerText += ` Sched OT 200%: ............................................................................................ \n`;
                unitDiv.innerText += ` ${rounded(
                    hours
                )}: .............................................................................................................................\n`;
                rateDiv.innerText += `${payRate * 2}...................................................................................................\n`;
                amountDiv.innerText += `${rounded(hours * payRate * 2)} \n`;

                return parseFloat(rounded(hours * payRate * 2));
            }
            //   NEED TO CHECK THIS!!!!
            //
            //  IF ITS A SUNDAY OT AND FINISHES ON MONDAY IS THE OT AND ANY NEXT DAY PORTION PAID ON THE MONDAY RATES????
            //
            //
            if(rowObj.day == "sun"){
                payDiv.innerText += ` Sched OT 150%: ............................................................................................ \n`;
            unitDiv.innerText += ` ${rounded(
                hours
            )}: .............................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 1.5}...................................................................................................\n`;
            amountDiv.innerText += `${rounded(hours * payRate * 1.5)} \n`;

            return parseFloat(rounded(hours * payRate * 1.5));
            }
        }
        else {
            // if more, OT is split
            if(rowObj.day == "fri"){
                //the friday portion
                payDiv.innerText += ` Sched OT 150%: ............................................................................................ \n`;
                unitDiv.innerText += ` ${rounded(
                    hours - nextDayPortion
                )}: .............................................................................................................................\n`;
                rateDiv.innerText += `${payRate * 1.5}...................................................................................................\n`;
                amountDiv.innerText += `${rounded((hours - nextDayPortion) * payRate * 1.5)} \n`;

                //the saturday portion
                payDiv.innerText += ` Sched OT 200%: ............................................................................................ \n`;
                unitDiv.innerText += ` ${rounded(
                    nextDayPortion
                )}: .............................................................................................................................\n`;
                rateDiv.innerText += `${payRate * 2}...................................................................................................\n`;
                amountDiv.innerText += `${rounded((nextDayPortion) * payRate * 2)} \n`;

                return parseFloat((rounded(hours - nextDayPortion) * payRate * 1.5) + (rounded((nextDayPortion) * payRate * 2)));
            }
            //   NEED TO CHECK THIS!!!!
            //
            //  IF ITS A SUNDAY OT AND FINISHES ON MONDAY IS THE OT AND ANY NEXT DAY PORTION PAID ON THE MONDAY RATES????
            //
            //
            if(rowObj.day == "sun"){
                //the sunday portion
                payDiv.innerText += ` Sched OT 200%: ............................................................................................ \n`;
                unitDiv.innerText += ` ${rounded(
                    hours - nextDayPortion
                )}: .............................................................................................................................\n`;
                rateDiv.innerText += `${payRate * 2}...................................................................................................\n`;
                amountDiv.innerText += `${rounded((hours - nextDayPortion) * payRate * 2)} \n`;

                //the monday portion
                payDiv.innerText += ` Sched OT 150%: ............................................................................................ \n`;
                unitDiv.innerText += ` ${rounded(
                    nextDayPortion
                )}: .............................................................................................................................\n`;
                rateDiv.innerText += `${payRate * 1.5}...................................................................................................\n`;
                amountDiv.innerText += `${rounded((nextDayPortion) * payRate * 1.5)} \n`;

                return parseFloat((rounded(hours - nextDayPortion) * payRate * 2) + (rounded((nextDayPortion) * payRate * 1.5)));
            }
        }
    }


}

function ExcessShift(rowObj, payRate){
    if(!rowObj.timeWorked){
        return 0;
    }

    let hours = rowObj.timeWorkedInUnits;
    //check the day. weekdays = 150%, saturday = 200%
    //if weekday, check the hours worked, first 11 hours is 150%,
    //after 11 hours is 200%
    if(rowObj.excessDayNormal == undefined && rowObj.excessDayDouble == undefined){
        return 0;
    }

    if(rowObj.day !== "sat"){
        if (hours < 11) {   
            payDiv.innerText += ` Overtime @ 150%: ........................................................................................ \n`;
            unitDiv.innerText += ` ${rounded(
              hours
            )}: ........................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 1.5}...................................................................................................\n`;
            amountDiv.innerText += ` ${rounded(hours * payRate * 1.5)}\n`;
            return parseFloat(rounded(hours * payRate * 1.5));
        }
        if (hours > 11) {
            //up to 11 hours is 150%
            payDiv.innerText += ` Overtime @ 150%: ................................................................................................  \n`;
            unitDiv.innerText += ` ${rounded(
              11
            )}: ...................................................................................................................................... \n`;
            rateDiv.innerText += `${payRate * 1.5}...................................................................................................\n`;
            amountDiv.innerText += ` ${rounded(11 * payRate * 1.5)}   \n`;

            // over 11 hours is 200%
            payDiv.innerText += ` Overtime @ 200%: .................................................................................................  \n`;
            unitDiv.innerText += ` ${rounded(
              hours - 11
            )}: ...................................................................................................................................... \n`;
            rateDiv.innerText += `${payRate * 2}...................................................................................................\n`;
            amountDiv.innerText += `  ${rounded(
              (hours - 11) * payRate * 2
            )}   \n`;
            return parseFloat((rounded(11 * payRate * 1.5)) + (rounded((hours - 11) * payRate * 2)));
        }
    }

    if(rowObj.day == "sat"){
        payDiv.innerText += ` Overtime @ 200%: .................................................................................................  \n`;
        unitDiv.innerText += ` ${rounded(
        hours
        )}: ...................................................................................................................................... \n`;
        rateDiv.innerText += `${payRate * 2}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(hours * payRate * 2)}  \n`;

        return parseFloat(rounded(hours * payRate * 2));
    }
}

function ExtraKMAsUnits(rowObj){
    const extraKmTiers = [
        16.093, 24.14, 32.187, 40.234, 48.281, 56.328, 64.375, 72.422, 80.469,
        88.516, 96.563, 104.61, 112.657, 120.704, 128.751, 136.798, 144.845,
        152.892,
      ];
      const extraKmTimesInUnits = [
        0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0,
        4.25, 4.5, 4.75, 5.0,
      ];

      
      if(!rowObj.extraKM){
          return 0;
        }
        
        let extraKmAsUnits = 0.00;
      if(!!rowObj.extraKM){
        for (let i = 0; i < extraKmTiers.length; i++) {
            //0 - 16.093kms
            if (rowObj.extraKM <= extraKmTiers[i] && i === 0)
              extraKmAsUnits = extraKmTimesInUnits[i];
            //16.094 - 152.892
            if (rowObj.extraKM > extraKmTiers[i - 1] && rowObj.extraKM <= extraKmTiers[i]) {
              extraKmAsUnits = extraKmTimesInUnits[i];
            }
            //152.893 and over by 8.046 increments of 15 minutes
            if (rowObj.extraKM > extraKmTiers[i] && i === 17) {
              extraKmAsUnits = extraKmTimesInUnits[i];
              //how many additional increments of 15 minutes
              //Math.ceil()
              // multiply by 15 mins or .25 units
              let x = Math.ceil((rowObj.extraKM - extraKmTiers[i]) / 8.046) * 0.25;
              extraKmAsUnits += x;
            }
        }
      }

      return parseFloat(extraKmAsUnits);
}

function MorningShiftPenalty(rowObj){
    if(rowObj.excessDayNormal || rowObj.excessDayDouble){
        return 0;
    }

    if(!rowObj.timeWorked || rowObj.PH || rowObj.day == "sat" || rowObj.day == "sun"){
        return 0;
    }

    let hours = Math.round(rowObj.totalWorked);
    if(hours >= 8){
        hours = 8;
    }

    if (changeToUnits(rowObj.actualStart) >= 4.00 && changeToUnits(rowObj.actualStart) <= 5.5) {
    payDiv.innerText += ` Morning Shift Dvrs/Grds Hrl: ......................................................................................\n`;
    unitDiv.innerText += `${hours}: ...................................................................................................\n`;
    rateDiv.innerText += `${earlyMorningShiftPenalty}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(hours * earlyMorningShiftPenalty)}\n`;
    return parseFloat(rounded(hours * earlyMorningShiftPenalty));
    }

      return 0.00;

}

function AfternoonShiftPenalty(rowObj){
    if(rowObj.excessDayNormal || rowObj.excessDayDouble){
        return 0;
    }

    if(!rowObj.timeWorked || rowObj.PH && !rowObj.finishesNextDay || rowObj.day == "sat" || rowObj.day == "sun"){
        return 0;
    }

    let hours = Math.round(rowObj.totalWorked);
    if(hours >= 8){
        hours = 8;
    }

    if (changeToUnits(rowObj.actualStart) < 18 && changeToUnits(rowObj.actualFinish) > 18) {
        payDiv.innerText += `Afternoon Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${hours}: .................................................................................................................\n`;
        rateDiv.innerText += `${afternoonShiftPenalty}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(hours * afternoonShiftPenalty)}\n`;
        return parseFloat(rounded(hours * afternoonShiftPenalty));
    }

    if( changeToUnits(rowObj.actualStart) < 18 && rowObj.finishesNextDay){
        let nextDayPortion = changeToUnits(rowObj.actualFinish);
        let previousDayPortion = rowObj.timeWorkedInUnits - nextDayPortion;
        let payablePortion = 0;

        if(previousDayPortion >= 8){
            payablePortion = 8;
        }
        if(previousDayPortion < 8){
            payablePortion = Math.round(previousDayPortion);
        }

        payDiv.innerText += `Afternoon Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${payablePortion}: .................................................................................................................\n`;
        rateDiv.innerText += `${afternoonShiftPenalty}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(payablePortion * afternoonShiftPenalty)}\n`;
        return parseFloat(rounded(payablePortion * afternoonShiftPenalty));
    }

      return 0.00;
}

function NightShiftPenalty(rowObj){
    if(rowObj.excessDayNormal || rowObj.excessDayDouble){
        return 0;
    }

    if(!rowObj.timeWorked || rowObj.PH && !rowObj.finishesNextDay || rowObj.day == "sat" || rowObj.day == "sun"){
        return 0;
    }

    let hours = Math.round(rowObj.totalWorked);
    if(hours >= 8){
        hours = 8;
    }

    if(rowObj.day == "fri" && !!rowObj.finishesNextDay && (changeToUnits(rowObj.actualStart) <= 3.98 || changeToUnits(rowObj.actualStart) >= 18)){
        let nextDayPortion = changeToUnits(rowObj.actualFinish);
        let previousDayPortion = rowObj.timeWorkedInUnits - nextDayPortion;

        payDiv.innerText += `Night Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${previousDayPortion}: .................................................................................................................\n`;
        rateDiv.innerText += `${nightShiftPenalty}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(previousDayPortion * nightShiftPenalty)}\n`;
        return parseFloat(rounded(previousDayPortion * nightShiftPenalty));
    }

    if (changeToUnits(rowObj.actualStart) <= 3.98 || changeToUnits(rowObj.actualStart) >= 18) {
        payDiv.innerText += `Night Shift Dvrs/Grds Hrl: ......................................................................................\n`;
        unitDiv.innerText += `${hours}: .................................................................................................................\n`;
        rateDiv.innerText += `${nightShiftPenalty}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(hours * nightShiftPenalty)}\n`;
        return parseFloat(rounded(hours * nightShiftPenalty));
    }

    return 0.00;
}

/*********************************************************************

NEED TO CHECK IF SPECIAL LOADING IS PAID IF IT FINISHES ON A SATURDAY OR A PH

*********************************************************************/
function SpecialLoadingPenalty(rowObj){
    if(rowObj.excessDayNormal || rowObj.excessDayDouble){
        return 0;
    }

    if(!rowObj.timeWorked || rowObj.PH && !rowObj.finishesNextDay){
        return 0;
    }

    if(rowObj.day == "sun" && rowObj.finishesNextDay == undefined || rowObj.day == "sat" || rowObj.day == "fri" && !!rowObj.finishesNextDay){
        return 0;
    }

    if (
        (changeToUnits(rowObj.actualStart) >= 1.02 && changeToUnits(rowObj.actualStart) <= 3.98) ||
        (changeToUnits(rowObj.actualFinish) >= 1.02 && changeToUnits(rowObj.actualFinish) <= 3.98)
        //WHAT IF THE SHIFT STARTS ON A NON PH AND FINISHES ON A PH IN THE SPECIAL LOADING PERIOD?
      ) {
        payDiv.innerText += `Special Loading Drvs/Grds: ......................................................................................\n`;
        unitDiv.innerText += `1: .............................................................................................................\n`;
        rateDiv.innerText += `${specialLoading}...................................................................................................\n`;
        amountDiv.innerText += `${specialLoading}\n`;
        return parseFloat(specialLoading);
      }

      return 0;
}

function SaturdayLoading(rowObj, payRate){
    //if its an excess day, exit
    if(rowObj.excessDayNormal || rowObj.excessDayDouble){
        return 0;
    }

    //if its not a worked day, exit
    if(!rowObj.timeWorked){
        return 0;
    }

    //if its a saturday PH, exit
    if(rowObj.day == "sat" && !!rowObj.PH){
        return 0;
    }

    //if it finishes the next day and the day isnt friday or saturday
    if(rowObj.finishesNextDay && rowObj.day !== "fri" && rowObj.day !== "sat"){
        return 0;
    }

    //if it doesnt finish the next day and the day isnt saturday
    if(rowObj.finishesNextDay == undefined && rowObj.day !== "sat"){
        return 0;
    }

    let hours = Math.round(rowObj.totalWorked);
    if (hours >= 8) {
        hours = 8;
    }
      
    if(rowObj.day == "sat" && !rowObj.finishesNextDay){
        payDiv.innerText += ` Loading @ 50% Saturday: ......................................................................................\n`;
        unitDiv.innerText += `${
        rounded(hours)
        }: ...........................................................................................................................\n`;
        rateDiv.innerText += `${payRate * 0.5}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(
            hours * payRate * 0.5
        )}\n`;

        return parseFloat(rounded(hours * payRate * 0.5));
    }

    if(rowObj.day == "sat" && rowObj.finishesNextDay){
        let nextDayPortion = changeToUnits(rowObj.actualFinish);
        let previousDayPortion = rounded(rowObj.timeWorkedInUnits - nextDayPortion);

        if(rowObj.timeWorkedInUnits < 8){
            payDiv.innerText += ` Loading @ 50% Saturday: ......................................................................................\n`;
            unitDiv.innerText += `${
            previousDayPortion
            }: ...........................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 0.5}...................................................................................................\n`;
            amountDiv.innerText += `${rounded(
                previousDayPortion * payRate * 0.5
            )}\n`;

            return parseFloat(rounded(previousDayPortion * payRate * 0.5));
        }
        if(rowObj.timeWorkedInUnits > 8){
            let payablePortion = 0;
            if(previousDayPortion > 8){
                payablePortion = 8;
            }
            if(previousDayPortion < 8){
                payablePortion = Math.round(previousDayPortion);
            }

            payDiv.innerText += ` Loading @ 50% Saturday: ......................................................................................\n`;
            unitDiv.innerText += `${
            payablePortion
            }: ...........................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 0.5}...................................................................................................\n`;
            amountDiv.innerText += `${rounded(
                payablePortion * payRate * 0.5
            )}\n`;

            return parseFloat(rounded(payablePortion * payRate * 0.5));
        }
    }

    if(rowObj.finishesNextDay && rowObj.day == "fri"){
        let nextDayPortion = changeToUnits(rowObj.actualFinish);
        if(rowObj.timeWorkedInUnits < 8){
            payDiv.innerText += ` Loading @ 50% Saturday: ......................................................................................\n`;
            unitDiv.innerText += `${
            rounded(nextDayPortion)
            }: ...........................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 0.5}...................................................................................................\n`;
            amountDiv.innerText += `${rounded(
                nextDayPortion * payRate * 0.5
            )}\n`;

            return parseFloat(rounded(nextDayPortion * payRate * 0.5));
        }
        if(rowObj.timeWorkedInUnits > 8){
            let previousDayPortion = rowObj.timeWorkedInUnits - nextDayPortion;
            let payablePortion = 8 - previousDayPortion;

            payDiv.innerText += ` Loading @ 50% Saturday: ......................................................................................\n`;
            unitDiv.innerText += `${
            rounded(payablePortion)
            }: ...........................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 0.5}...................................................................................................\n`;
            amountDiv.innerText += `${rounded(
                payablePortion * payRate * 0.5
            )}\n`;

            return parseFloat(rounded(payablePortion * payRate * 0.5));
        }
    }

    return 0.00;
}

function SundayLoading(rowObj, payRate){
    //exit if:
    //if theres no time worked
    //its a PH sunday
    //job isnt a saturday that finishes the next day
    //day isnt a sunday
    if(rowObj.excessDayNormal || rowObj.excessDayDouble){
        return 0;
    }

    if(!rowObj.timeWorked || rowObj.day == "sun" && rowObj.PH){
        return 0;
    }

    if(rowObj.finishesNextDay && rowObj.day !== "sat" && rowObj.day !== "sun"){
        return 0;
    }

    let hours = Math.round(rowObj.totalWorked);
    if (hours >= 8) {
        hours = 8;
    }

    if(rowObj.day == "sun" && !rowObj.finishesNextDay){
        payDiv.innerText += ` Loading @ 100% Sunday: ......................................................................................\n`;
        unitDiv.innerText += `${
          hours
        }: .................................................................................................................\n`;
        rateDiv.innerText += `${payRate * 1}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(
          hours * payRate * 1
        )}\n`;

        return parseFloat(rounded(hours * payRate * 1));
    }

    if(rowObj.day == "sun" && rowObj.finishesNextDay){
        let nextDayPortion = changeToUnits(rowObj.actualFinish);
        let previousDayPortion = rounded(rowObj.timeWorkedInUnits - nextDayPortion);

        if(rowObj.timeWorkedInUnits < 8){
            payDiv.innerText += ` Loading @ 100% Sunday: ......................................................................................\n`;
            unitDiv.innerText += `${
            previousDayPortion
            }: ...........................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 1}...................................................................................................\n`;
            amountDiv.innerText += `${rounded(
                previousDayPortion * payRate * 1
            )}\n`;

            return parseFloat(rounded(previousDayPortion * payRate * 1));
        }
        if(rowObj.timeWorkedInUnits > 8){
            let payablePortion = 0;
            if(previousDayPortion > 8){
                payablePortion = 8;
            }
            if(previousDayPortion < 8){
                payablePortion = Math.round(previousDayPortion);
            }

            payDiv.innerText += ` Loading @ 100% Sunday: ......................................................................................\n`;
            unitDiv.innerText += `${
            payablePortion
            }: ...........................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 1}...................................................................................................\n`;
            amountDiv.innerText += `${rounded(
                payablePortion * payRate * 1
            )}\n`;

            return parseFloat(rounded(payablePortion * payRate * 1));
        }
    }

    if(rowObj.finishesNextDay && rowObj.day == "sat"){
        let nextDayPortion = changeToUnits(rowObj.actualFinish);
        
        if(rowObj.timeWorkedInUnits <= 8){
            payDiv.innerText += ` Loading @ 100% Sunday: ......................................................................................\n`;
            unitDiv.innerText += `${
            rounded(nextDayPortion)
            }: .................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 1}...................................................................................................\n`;
            amountDiv.innerText += `${rounded(
                nextDayPortion * payRate * 1
            )}\n`;

            return parseFloat(rounded(nextDayPortion * payRate * 1));
        }

        if(rowObj.timeWorkedInUnits > 8){
            let previousDayPortion = Math.round(rowObj.timeWorkedInUnits - nextDayPortion);
            let payablePortion = 8 - previousDayPortion;

            payDiv.innerText += ` Loading @ 100% Sunday: ......................................................................................\n`;
            unitDiv.innerText += `${
            rounded(payablePortion)
            }: .................................................................................................................\n`;
            rateDiv.innerText += `${payRate * 1}...................................................................................................\n`;
            amountDiv.innerText += `${rounded(
                payablePortion * payRate * 1
            )}\n`;

            return parseFloat(rounded(payablePortion * payRate * 1));
        }
    }

    return 0;
}

function Hol(rowObj, payRate){
    if(!rowObj.hol){
        return 0;
    }
    //shiftlength * payRate for the day
    payDiv.innerText += `HOL: ............................................................................................................................................................\n`;
    unitDiv.innerText += `8: .......................................................................................................................................................\n`;
    rateDiv.innerText += `${payRate}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(8 * payRate)}\n`;

    return parseFloat(rounded(8 * payRate));
}

function PublicHolidayLoading(rowObj, payRate){ //normal hours + PH loading
    if(rowObj.hol || !rowObj.timeWorked || !rowObj.PH){
        return 0;
    }

    let hours = rowObj.timeWorkedInUnits;
    if (Math.round(hours) >= 8) {
        hours = 8;
    }

    if(rowObj.day !== "sat" && !rowObj.finishesNextDay || rowObj.day !== "sun" && !rowObj.finishesNextDay){
        payDiv.innerText += ` PH Loading @ 50%: ......................................................................................\n`;
        unitDiv.innerText += `${Math.round(
            hours
        )}: .................................................................................................................\n`;
        rateDiv.innerText += `${payRate * 0.5}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(
            hours * payRate * 0.5
        )}\n`;

        return parseFloat(rounded(hours * payRate * 0.5));
    }

    if(rowObj.day == "sat" && !rowObj.finishesNextDay || rowObj.day == "sun" && !rowObj.finishesNextDay){
        payDiv.innerText += ` PH Loading @ 100%: ......................................................................................\n`;
        unitDiv.innerText += `${Math.round(
            hours
        )}: .................................................................................................................\n`;
        rateDiv.innerText += `${payRate * 1}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(
            hours * payRate * 1
        )}\n`;

        return parseFloat(rounded(hours * payRate * 1));
    }

    //add one for if it does finish next day and the previous day is a PH or the next day is a PH
}
    
function PublicHoliday(rowObj, payRate){
    //check if its accrued or not
    if(!rowObj.PH){
        return 0;
    }

    if(!rowObj.accruePH){
        payDiv.innerText += `Public Holiday Paid: ......................................................................................\n`;
        unitDiv.innerText += `8: .........................................................................................................................................\n`;
        rateDiv.innerText += `${payRate}...................................................................................................\n`;
        amountDiv.innerText += `${rounded(8 * payRate)}\n`;

        return parseFloat(rounded(8 * payRate));
    }

    if(rowObj.PH && rowObj.accruePH){
        payDiv.innerText += ` Public Holiday Accrued  \n`;
        unitDiv.innerText += `8\n`;
        rateDiv.innerText += `\n`;
        amountDiv.innerText += `\n`;

        return 0;
    }
}

function SickDay(rowObj, payRate){
    if(!rowObj.sick){
        return 0;
    }

    payDiv.innerText += `Sick: ..............................................................................................................................................\n`;
    unitDiv.innerText += `${8}: .........................................................................................................................................\n`;
    rateDiv.innerText += `${payRate}...................................................................................................\n`;
    amountDiv.innerText += `${rounded(8 * payRate)}\n`;

    return parseFloat(rounded(8 * payRate));
}

function AdoAdjustment(longFortnight, payRate){
if (longFortnight) {
    payDiv.innerText += ` \nADO Adjustment: .............................................................................................................................................\n`;
    unitDiv.innerText += ` \n-4: ....................................................................................................................................................................\n`;
    rateDiv.innerText += `\n${payRate}...................................................................................................\n`;
    amountDiv.innerText += ` \n${rounded(4 * payRate * -1)}\n`;
    return parseFloat(rounded(4 * payRate * -1));
  } else {
    payDiv.innerText += ` \nADO Adjustment: ...............................................................................................................................\n`;
    unitDiv.innerText += ` \n4: ......................................................................................................................................................\n`;
    rateDiv.innerText += `\n${payRate}...................................................................................................\n`;
    amountDiv.innerText += ` \n${rounded(4 * payRate)}\n`;
    return parseFloat(rounded(4 * payRate));
  }
}

function AdoAdjustmentForGuarantee(longFortnight){
    if(longFortnight){
        return parseFloat(-4.00);
    }

    if(!longFortnight){
        return parseFloat(4.00);
    }
}

/***********************************
 * 
 * CHECK IF CALLOUT IS FOR 8 HOURS OR ENTIRE SHIFT
 * 
********************************* */

function CallOut(rowObj, payRate){
    if(!rowObj.callout){
        return 0;
    }

    let hours = rowObj.timeWorkedInUnits;
    if (hours > 8) {
        hours = 8;
      }
  
      payDiv.innerText += ` Callout @ 25%: ............................................................................................ \n`;
      unitDiv.innerText += ` ${hours}: .............................................................................................................................\n`;
      rateDiv.innerText += `${payRate * 0.25}...................................................................................................\n`;
      amountDiv.innerText += `${rounded(hours * payRate * 0.25)} \n`;

      return parseFloat(rounded(hours * payRate * 0.25));

}

function Wobod(rowObj, payRate){
    if(!rowObj.OT){
        return 0;
    }

    let hours = rowObj.timeWorkedInUnits;
    //check if theres callout, if so, wobod = 23% of pay
    //otherwise wobod = 48% of the days pay
    //sick days cancel out wobods
    if (!rowObj.callout) {
        payDiv.innerText += `\nNEXT FORTNIGHT WOBOD PAYMENT: ...............................................................................................................................\n`;
        unitDiv.innerText += ` \n@${hours}......................................................................................................................................................\n`;
        rateDiv.innerText += `\n48%...................................................................................................\n`;
        amountDiv.innerText += ` \n${rounded(
            hours * payRate * 0.48
        )}\n`;
      }
    if(rowObj.callout){
        payDiv.innerText += `\nNEXT FORTNIGHT WOBOD PAYMENT: ...............................................................................................................................\n`;
        unitDiv.innerText += ` \n@${hours}......................................................................................................................................................\n`;
        rateDiv.innerText += `\n23%...................................................................................................\n`;
        amountDiv.innerText += ` \n${rounded(
          hours * payRate * 0.23
        )}\n`;
      }
}

function GuaranteePayment(payObj) {
    if (payObj.ordinaryUnits >= 76 - payObj.timeLost) {
      return 0;
    }

      let shortFall = rounded(76 - payObj.timeLost - payObj.ordinaryUnits);

      payDiv.innerText += ` \nGuarantee: ...............................................................................................................................\n`;
      unitDiv.innerText += ` \n${shortFall}: ......................................................................................................................................................\n`;
      rateDiv.innerText += `\n${payObj.payrate}...................................................................................................\n`;
      amountDiv.innerText += ` \n${rounded(shortFall * payObj.payrate)}\n`;

      return parseFloat(rounded(shortFall * payObj.payrate));
    
  }

function changeToMinutes(time){
    if(time.trim() == ""){
        throw error(
            'need a time to change to units'
        );
    }

    let minutesTime = time.match(/.{2}/g);
    let mlHr = parseInt(minutesTime[0]) * 60;
    let mlMin = parseInt(minutesTime[1]);

    return mlHr + mlMin;
}
    
function changeToUnits(time){
    if(time.trim() == ""){
        throw error(
            'need a time to change to units'
        );
    }

    let minutesTime = time.match(/.{2}/g);
    let timeInMinutes =
    parseInt(minutesTime[0]) * 60 + parseInt(minutesTime[1]);
    timeInUnits = rounded(timeInMinutes / 60);
    return timeInUnits;
}

function rounded(numberData) {
    if(numberData == isNaN){
        throw error(
            'need a number to round'
        );
    }

    return (Math.round((numberData) * 100) / 100).toFixed(2);
}

//converts minutes to units
function minutesAsUnits(minutes) {
return Math.round((minutes / 60) * 100) / 100;
}

//converts units to minutes
function unitsAsMinutes(units) {
return Math.round(units * 60);
}

//rounds to integer?
function roundedUnits(minutes) {
return Math.round(minutes / 60);
}

function DisplayBreakdown(tableObj){
    const payTableRows = document.querySelectorAll(".dataRow"); //get all the rows to show data
    // console.log(tableObj);

    for (let i = 0; i < payTableRows.length; i++) {
        const rowCells = payTableRows[i].querySelectorAll("td"); 

        if(tableObj[i].RDO == true) { //if the day is an RDO, show its an rdo and skip row
            rowCells[1].innerHTML = "RDO";    
            continue;
        }
        if(tableObj[i].sick == true) { //if the day is a sick day, show its sick and skip row
            rowCells[1].innerHTML = tableObj[i]['rosteredStart'];
            rowCells[2].innerHTML = "SICK";
            rowCells[3].innerHTML = tableObj[i]['rosteredFinish'];
            continue;
        }
        
        rowCells[1].innerHTML = tableObj[i]['rosteredStart'];
        rowCells[2].innerHTML = tableObj[i]['actualStart'];
        rowCells[3].innerHTML = tableObj[i]['rosteredFinish'];
        rowCells[4].innerHTML = tableObj[i]['actualFinish'];
        rowCells[5].innerHTML = tableObj[i]['timeWorked'] + ' / ' + tableObj[i]['timeWorkedInUnits'];
        rowCells[6].innerHTML = tableObj[i]['liftupAsUnits'] ? tableObj[i]['liftupAsUnits'] : '';
        rowCells[7].innerHTML = tableObj[i]['laybackAsUnits'] ? tableObj[i]['laybackAsUnits']: '';
        rowCells[8].innerHTML = tableObj[i]['buildupAsUnits'] ? tableObj[i]['buildupAsUnits'] : '';
        rowCells[9].innerHTML = tableObj[i]['milage'] ? tableObj[i]['milage'] : '';
        rowCells[10].innerHTML = tableObj[i]['extraKM'] ? tableObj[i]['extraKM'] : '';
        rowCells[11].innerHTML = tableObj[i]['PH'] ? tableObj[i]['PH'] : '';
        rowCells[12].innerHTML = tableObj[i]['accruePH'] ? tableObj[i]['accruePH'] : '';
        rowCells[13].innerHTML = tableObj[i]['OT'] ? tableObj[i]['OT'] : '';
        rowCells[14].innerHTML = tableObj[i]['callout'] ? tableObj[i]['callout'] : '';
        rowCells[15].innerHTML = tableObj[i]['totalWorked'];
    }
}
