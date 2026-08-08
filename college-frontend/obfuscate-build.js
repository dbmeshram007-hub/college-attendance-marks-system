const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const buildFolder = path.join(__dirname, 'build', 'static', 'js');

function obfuscateFolder(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`❌ Build folder not found at ${dir}.`);
        return;
    }

    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            obfuscateFolder(filePath);
        } else if (file.endsWith('.js')) {
            console.log(`🔒 Safely obfuscating: ${file}...`);
            const code = fs.readFileSync(filePath, 'utf8');
            
            const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
                compact: true,
                controlFlowFlattening: false, // Disabled to prevent breaking library internals
                deadCodeInjection: false,     // Disabled for stability
                identifierNamesGenerator: 'hexadecimal',
                renameGlobals: false,
                rotateStringArray: true,
                selfDefending: false,         // Disabled to prevent browser console conflicts
                stringArray: true,
                stringArrayEncoding: ['base64'],
                stringArrayThreshold: 0.75,
                unicodeEscapeSequence: false
            }).getObfuscatedCode();

            fs.writeFileSync(filePath, obfuscatedCode, 'utf8');
            console.log(`✅ Successfully protected: ${file}`);
        }
    });
}

console.log("🛡️ Running safe frontend code protection...");
obfuscateFolder(buildFolder);
console.log("🎉 Build successfully protected and stable!");