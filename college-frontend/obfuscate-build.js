const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const buildFolder = path.join(__dirname, 'build', 'static', 'js');

function obfuscateFolder(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`❌ Build folder not found at ${dir}. Run 'npm run build' first.`);
        return;
    }

    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            obfuscateFolder(filePath);
        } else if (file.endsWith('.js')) {
            console.log(`🔒 Scrambling: ${file}...`);
            const code = fs.readFileSync(filePath, 'utf8');
            
            const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.75,
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 0.4,
                identifierNamesGenerator: 'hexadecimal',
                renameGlobals: false,
                rotateStringArray: true,
                selfDefending: true,
                stringArray: true,
                stringArrayEncoding: ['base64'],
                stringArrayThreshold: 0.8,
                unicodeEscapeSequence: false
            }).getObfuscatedCode();

            fs.writeFileSync(filePath, obfuscatedCode, 'utf8');
            console.log(`✅ Successfully scrambled: ${file}`);
        }
    });
}

console.log("🛡️ Starting frontend code protection...");
obfuscateFolder(buildFolder);
console.log("🎉 Frontend code is now fully obfuscated and protected against F12 inspection!");