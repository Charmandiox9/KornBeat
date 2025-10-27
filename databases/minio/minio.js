const Minio = require('minio');

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

const bucketName = 'music-files';

async function initializeBucket() {
    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
            console.log(`✅ Bucket "${bucketName}" created successfully.`);
        } else {
            console.log(`✅ Bucket "${bucketName}" already exists.`);
        }
    } catch (err) {
        console.error('❌ Error initializing MinIO bucket:', err);
    }
}

module.exports = {
    minioClient,
    bucketName,
    initializeBucket
};