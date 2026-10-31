Pod::Spec.new do |s|
  s.name = 'RoutineScreenTime'
  s.version = '0.1.0'
  s.summary = 'Personal routine Screen Time verification'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Calendar'
  s.homepage = 'https://github.com/Apple7575/calendar'
  s.source = { :git => 'https://github.com/Apple7575/calendar.git' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.0'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'DeviceActivity', 'SwiftUI', 'UserNotifications'
end
