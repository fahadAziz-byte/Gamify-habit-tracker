function calculatePoints(basePoints, user) {
    let finalPoints = basePoints;

    if(!user|| !user.inventory){
   
        console.error(" user or inventory is null ");
        return finalPoints;
       
    
    
      }
    



    user.inventory.forEach((potion) => {
        if (potion.activatedAt) {
            const activationDate = new Date(potion.activatedAt);
            const expiryDate = new Date(activationDate);
            expiryDate.setDate(activationDate.getDate() + potion.duration);

            if (new Date() <= expiryDate) {
                if (potion.effectType === 'habitMultiplier') {
                    finalPoints *= 2; 
                } else if (potion.effectType === 'challengeMultiplier') {
                    finalPoints *= 1.5; 
                }
            }
        }
    });

    return finalPoints;
}

module.exports = { calculatePoints };
