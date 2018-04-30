import ast
import boto3
import configparser
import random
import sys
from dynamodb_json import json_util
from weather import Weather
from xml.dom import minidom
try:
	from urllib.request import urlopen
	from urllib.parse import urlencode
except ImportError:
	from urllib import urlopen, urlencode

configFilePath = "server/utilities/configs/config.cfg"

try:
	config = configparser.ConfigParser()
	config.read(configFilePath)
except Exception as error:
	raise("Error reading in the config file with error: {}".format(error))

def getWeatherInformation(location):
	print ("hello its me")
	weather=Weather(unit='f')
	info = weather.lookup_by_location(location)
	forecast = info.forecast[0]
	weatherInfo = {'Condition': forecast.text,
				   'High': forecast.high,
				   'Low': forecast.low}
	return weatherInfo

def weatherClothingRecommendation(weatherInfo):
	low = int(weatherInfo['Low'])
	high = int(weatherInfo['High'])
	rtrnList = []
	if low >= 75:
		rtrnList.append('Hot')
	elif low >= 60:
		if high <= 79:
			rtrnList.append('Warm')
		else:
			rtrnList.append('Hot')
	elif low >= 50:
		if high >= 60:
			rtrnList.append('Warm')
		else:
			rtrnList.append('Cold')
	elif low >= 40:
		if high >= 50:
			rtrnList.append('Cold')
		else:
			rtrnList.append('Frigid')
	else:
		if high >= 40:
			rtrnList.append('Frigid')
		else:
			rrtrnList.append('Freezing')
	if ('snow' in weatherInfo['Condition'].lower() or
		'hail' in weatherInfo['Condition'].lower() or
		'sleet' in weatherInfo['Condition'].lower()):
		rtrnList.append('Snow')
	elif ('rain' in weatherInfo['Condition'].lower() or
		'drizzle' in weatherInfo['Condition'].lower() or
		'shower' in weatherInfo['Condition'].lower() or
		'storm' in weatherInfo['Condition'].lower()):
		rtrnList.append('Rain')
	return rtrnList

def recommendationAlgorithm(location, event, user_id):
	returnDict = {"Top": "", "Bottom": "", "Footwear": "" }
	ddbClient = boto3.client('dynamodb', region_name='us-east-1')
	weatherInfo = getWeatherInformation(location)
	weatherRec = weatherClothingRecommendation(weatherInfo)
	weatherItems = ast.literal_eval(config.get('Weather Clothing Types', weatherRec[0]))
	eventItems = ast.literal_eval(config.get('Event Clothing Types', event))
	possTops = ast.literal_eval(config.get('Required', 'Top'))
	possBottoms = ast.literal_eval(config.get('Required', 'Bottom'))
	possFootwear = ast.literal_eval(config.get('Required', 'Footwear'))
	response = ddbClient.get_item(TableName='User_Clothing',
										 Key={'User_Id':{'N': user_id}})
	clothingObjects = json_util.loads(response.get('Item', {}).get('ClothingObj'))
	specificWeatherItems = getAllWeatherItems()

	topTypes = getPossClothingTypes(possTops, eventItems)
	tops = returnItemsToRecommend(topTypes, clothingObjects['Tops'], weatherItems, specificWeatherItems)
	
	bottomTypes = getPossClothingTypes(possBottoms, eventItems)
	bottoms = returnItemsToRecommend(topTypes, clothingObjects['Bottoms'], weatherItems, specificWeatherItems)

	footwearTypes = getPossClothingTypes(possFootwear, eventItems)
	footwears = returnItemsToRecommend(topTypes, clothingObjects['Footwear'], weatherItems, specificWeatherItems)

	if tops:
		returnDict["Top"] = tops[random.randint(0, len(tops) - 1)]['S3FilePath']
	if bottoms:
		returnDict["Bottom"] = tops[random.randint(0, len(bottoms) - 1)]['S3FilePath']
	if footwears:
		returnDict["Footwear"] = tops[random.randint(0, len(footwears) - 1)]['S3FilePath']
	print (returnDict)
	return returnDict


def getAllWeatherItems():
	hot = ast.literal_eval(config.get('Weather Clothing Types', 'Hot'))
	warm = ast.literal_eval(config.get('Weather Clothing Types', 'Warm'))
	cold = ast.literal_eval(config.get('Weather Clothing Types', 'Cold'))
	frigid = ast.literal_eval(config.get('Weather Clothing Types', 'Frigid'))
	freezing = ast.literal_eval(config.get('Weather Clothing Types', 'Freezing'))
	return list(set(hot + warm + cold + frigid + freezing))


def getSpecificItems(selectedType, objects):
	return list(filter(lambda x: x['Type'] == selectedType, objects))

def getPossClothingTypes(possTypes, compareTypes):
	return [value for value in possTypes if value in compareTypes]

def doesTypeFitWeather(selectedType, weatherItems, specificWeatherItems):
	if selectedType in weatherItems:
		return True
	elif selectedType not in specificWeatherItems:
		return True
	else:
		return False

def returnItemsToRecommend(types, objects, weatherItems, specificWeatherItems):
	selectedType = ''
	typesCopy = list(types)
	while types and not selectedType:
		i = random.randint(0, len(types) - 1)
		selectedType = types[i]
		if not doesTypeFitWeather(selectedType, weatherItems, specificWeatherItems):
			types.remove(selectedType)
			selectedType = ''
			continue
		listOfObjectTypes = getSpecificItems(selectedType, objects)
		if not listOfObjectTypes:
			types.remove(selectedType)
			selectedType = ''
		else:
			return listOfObjectTypes
	return returnItemsToRecommendWithoutWeatherConsideration(typesCopy, objects)

def returnItemsToRecommendWithoutWeatherConsideration(types, objects):
	selectedType = ''
	while types and not selectedType:
		i = random.randint(0, len(types) - 1)
		selectedType = types[i]
		listOfObjectTypes = getSpecificItems(selectedType, objects)
		if not listOfObjectTypes:
			types.remove(selectedType)
			selectedType = ''
		else:
		 	return listOfObjectTypes
	return []



if __name__ == "__main__":
	recommendationAlgorithm('New York', 'Casual', '1')

# def reccomendationAlgorithm(location):
# t = config.get('Weather Clothing Types', 'Hot')
# t = ast.literal_eval(t)
# print (type(t))
# print (t)