const Habit = require('../models/habits');
const Users = require('../models/usersModel');
const DailyStreaks = require('../models/dailyStreaks');



async function performDailyUpdates() {
  try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      await Habit.updateMany(
          { isCompletedToday: true },
          {
              $set: {
                  isCompletedToday: false,
              },
          }
      );

      await Habit.updateMany(
          { lastCheckIn: { $lt: yesterday.toISOString() } },
          {
              $set: {
                  streak: 0,
              },
          }
      );

      const users = await Users.find();

      users.forEach(async user => {
          const currentDate = new Date();
  
          user.inventory = user.inventory.filter(item => {
              if (item.expirationDate && currentDate > item.expirationDate) {
                  console.log(`Potion with ID .${item.potionId} expired for user ${user.username}.`);
                  return false;
              }
              return true;
          });
  
          await user.save();
      });
  
      console.log('Potion expiration cleanup completed!');

      console.log("Daily updates performed successfully.");
  } catch (error) {
      console.error("Error performing daily updates:", error);
  }
}


async function checkAndPerformDailyUpdates() {
  try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let streakData = await DailyStreaks.findOne();

      if (!streakData) {
          streakData = new DailyStreaks({ lastUpdateDate: new Date(0) });
          await streakData.save();
      }

      const lastUpdateDate = new Date(streakData.lastUpdateDate);

      if (lastUpdateDate.getTime() !== today.getTime()) {
          await performDailyUpdates();

          streakData.lastUpdateDate = today;
          await streakData.save();
      }
      else{
          console.log('Already performed updates today')
      }
  } catch (error) {
      console.error("Error during daily updates check:", error);
  }
}


module.exports = { checkAndPerformDailyUpdates };
