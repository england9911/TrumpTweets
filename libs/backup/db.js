var common = require('../../routes/common');
var config = common.getConfig();

// Check for DB config
if(!config.databaseConnectionString) {
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}

const MBackup = require('s3-mongo-backup');

var backupConfig = {
   mongodb: config.databaseConnectionString, // MongoDB Connection URI 
    s3: {
        accessKey: process.env.AWS_ACCESS_KEY_ID,  //AccessKey
        secretKey: process.env.AWS_SECRET_ACCESS_KEY,  //SecretKey
        region: "us-east-2",     //S3 Bucket Region
        accessPerm: "private", //S3 Bucket Privacy, Since, You'll be storing Database, Private is HIGHLY Recommended
        bucketName: process.env.S3_DB_BACKUPS //Bucket Name
    },
    keepLocalBackups: false,  //If true, It'll create a folder in project root with database's name and store backups in it and if it's false, It'll use temporary directory of OS
    noOfLocalBackups: 5, //This will only keep the most recent 5 backups and delete all older backups from local backup directory
    timezoneOffset: 300 //Timezone, It is assumed to be in hours if less than 16 and in minutes otherwise
}


console.log(backupConfig);


//  For one time backup
MBackup(backupConfig).then(resolved => {
    console.log(resolved);
}, rejected => {
    console.error(rejected);
});
