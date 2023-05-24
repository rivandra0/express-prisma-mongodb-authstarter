
// two dateTime object
function getDifferenceInSecond (dateTime1, dateTime2) {
	const differenceInMs = dateTime2 - dateTime1
	const differenceInSeconds = Math.floor((dateTime1 - dateTime2)/1000)
	return Math.abs(differenceInSeconds)
}

export { getDifferenceInSecond }